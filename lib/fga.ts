// Friend Group Auth (https://group.nelsongx.com) client — server-side only.
// Implements the contracts in .claude/skills/friend-group-auth/reference.md.
import { env } from "@/lib/env";

const BASE = env.authBaseUrl;

// ---------------------------------------------------------------------------
// OAuth 2.0 + PKCE
// ---------------------------------------------------------------------------

export type Scope = "identify" | "roles" | "credits";

export function buildAuthorizeUrl(params: {
  redirectUri: string;
  state: string;
  codeChallenge: string;
  scopes: Scope[];
}): string {
  const u = new URL(`${BASE}/oauth/authorize`);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", env.clientId);
  u.searchParams.set("redirect_uri", params.redirectUri);
  u.searchParams.set("scope", params.scopes.join(" "));
  u.searchParams.set("state", params.state);
  u.searchParams.set("code_challenge", params.codeChallenge);
  u.searchParams.set("code_challenge_method", "S256");
  return u.toString();
}

export interface TokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
}

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${BASE}/api/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      ...body,
      client_id: env.clientId,
      client_secret: env.clientSecret,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`token endpoint ${res.status}: ${text}`);
  }
  return (await res.json()) as TokenResponse;
}

export function exchangeCode(opts: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<TokenResponse> {
  return tokenRequest({
    grant_type: "authorization_code",
    code: opts.code,
    redirect_uri: opts.redirectUri,
    code_verifier: opts.codeVerifier,
  });
}

export function refreshTokens(refreshToken: string): Promise<TokenResponse> {
  return tokenRequest({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

export interface UserInfo {
  sub: string;
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
  discord_id: string;
  allowed: boolean;
  in_guild: boolean;
  credits?: number;
}

export async function userinfo(accessToken: string): Promise<UserInfo> {
  const res = await fetch(`${BASE}/api/oauth/userinfo`, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`userinfo ${res.status}: ${text}`);
  }
  return (await res.json()) as UserInfo;
}

// ---------------------------------------------------------------------------
// Payments — 1 credit = 1 TWD (fixed, no conversion/markup)
// ---------------------------------------------------------------------------

async function payForm<T>(path: string, body: Record<string, string>): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.clientId,
      client_secret: env.clientSecret,
      ...body,
    }),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      `${path} ${res.status}: ${JSON.stringify(json)}`,
    ) as Error & { status?: number; payload?: unknown };
    err.status = res.status;
    err.payload = json;
    throw err;
  }
  return json as T;
}

export interface PayIntent {
  intent_id: string;
  url: string;
  amount: number;
  status: "pending";
  expires_at: string;
}

export function createPayIntent(opts: {
  amount: number;
  ref: string;
  redirectUri: string;
  description?: string;
  state?: string;
}): Promise<PayIntent> {
  const body: Record<string, string> = {
    amount: String(opts.amount),
    ref: opts.ref,
    redirect_uri: opts.redirectUri,
  };
  if (opts.description) body.description = opts.description;
  if (opts.state) body.state = opts.state;
  return payForm<PayIntent>("/api/pay/intent", body);
}

export interface PayVerifyResult {
  intent_id: string;
  status: "completed" | "cancelled" | "insufficient_funds" | "access_denied" | "pending";
  amount: number;
  ref: string;
  description: string | null;
  user_id: string;
  paid: boolean;
}

export function verifyPay(intentId: string): Promise<PayVerifyResult> {
  return payForm<PayVerifyResult>("/api/pay/verify", { intent_id: intentId });
}

export interface ReversePayResult {
  payout_id: string;
  status: "completed";
  amount: number;
  user_id: string;
  ref: string;
  duplicate: boolean;
  app_balance: number;
  paid: boolean;
}

// Pay/refund a user FROM the app balance. Used to refund a rejected request.
// Idempotent on (client, ref) — retrying the same ref will not pay twice.
// Throws with status 402 when the app balance is too low (insufficient_funds).
export function reversePay(opts: {
  userId: string;
  amount: number;
  ref: string;
  description?: string;
}): Promise<ReversePayResult> {
  const body: Record<string, string> = {
    user_id: opts.userId,
    amount: String(opts.amount),
    ref: opts.ref,
  };
  if (opts.description) body.description = opts.description;
  return payForm<ReversePayResult>("/api/pay/reverse", body);
}

// ---------------------------------------------------------------------------
// Hosted JSON data store (app scope) — this app has no DB of its own.
// Server-to-server only.
// ---------------------------------------------------------------------------

async function dataReq<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: env.clientId,
      client_secret: env.clientSecret,
      ...body,
    }),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${path} ${res.status}: ${JSON.stringify(json)}`);
  }
  return json as T;
}

export function dataSet(key: string, value: unknown): Promise<{ key: string; ok: true; updated_at: string }> {
  return dataReq("/api/data/set", { scope: "app", key, value });
}

export async function dataGet<T = unknown>(key: string): Promise<T | null> {
  const r = await dataReq<{ key: string; value: T; found: boolean }>("/api/data/get", {
    scope: "app",
    key,
  });
  return r.found ? r.value : null;
}

export function dataDelete(key: string): Promise<{ key: string; deleted: boolean }> {
  return dataReq("/api/data/delete", { scope: "app", key });
}

export async function dataList<T = unknown>(
  prefix: string,
): Promise<Array<{ key: string; value: T; updated_at: string }>> {
  const out: Array<{ key: string; value: T; updated_at: string }> = [];
  let cursor: string | null = null;
  do {
    const r: { entries: Array<{ key: string; value: T; updated_at: string }>; next_cursor: string | null } =
      await dataReq("/api/data/list", {
        scope: "app",
        prefix,
        limit: 100,
        ...(cursor ? { cursor } : {}),
      });
    out.push(...r.entries);
    cursor = r.next_cursor;
  } while (cursor);
  return out;
}
