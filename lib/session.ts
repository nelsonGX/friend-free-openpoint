// Signed (HMAC-SHA256) cookie sessions + PKCE/state helpers. Server-side only.
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { env, isAdminDiscordId } from "@/lib/env";

const SESSION_COOKIE = "op_session";
const OAUTH_COOKIE = "op_oauth";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionUser {
  sub: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
  discordId: string;
  allowed: boolean;
}

// --- signing -------------------------------------------------------------

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function sign(payload: string): string {
  return b64url(
    crypto.createHmac("sha256", env.sessionSecret).update(payload).digest(),
  );
}

// timing-safe equality
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// `<base64url(json)>.<sig>` with an embedded expiry.
function seal(data: object, ttlSeconds: number): string {
  const body = { ...data, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const payload = b64url(Buffer.from(JSON.stringify(body)));
  return `${payload}.${sign(payload)}`;
}

function unseal<T>(token: string | undefined): T | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!safeEqual(sig, sign(payload))) return null;
  try {
    const obj = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof obj.exp === "number" && obj.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return obj as T;
  } catch {
    return null;
  }
}

const isProd = process.env.NODE_ENV === "production";

// --- session -------------------------------------------------------------

export async function createSession(user: SessionUser): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, seal(user, SESSION_TTL_SECONDS), {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const user = unseal<SessionUser & { exp: number }>(store.get(SESSION_COOKIE)?.value);
  if (!user || !user.allowed) return null;
  return {
    sub: user.sub,
    username: user.username,
    globalName: user.globalName,
    avatar: user.avatar,
    discordId: user.discordId,
    allowed: user.allowed,
  };
}

export function sessionIsAdmin(user: SessionUser | null): boolean {
  return !!user && isAdminDiscordId(user.discordId);
}

// --- PKCE + state (stored in a short-lived signed cookie) ----------------

export interface OAuthFlowState {
  state: string;
  codeVerifier: string;
  returnTo?: string;
}

export function generatePkce(): { verifier: string; challenge: string; state: string } {
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
  const state = b64url(crypto.randomBytes(16));
  return { verifier, challenge, state };
}

export async function setOAuthFlow(flow: OAuthFlowState): Promise<void> {
  const store = await cookies();
  store.set(OAUTH_COOKIE, seal(flow, 600), {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
}

export async function consumeOAuthFlow(): Promise<OAuthFlowState | null> {
  const store = await cookies();
  const flow = unseal<OAuthFlowState & { exp: number }>(store.get(OAUTH_COOKIE)?.value);
  store.delete(OAUTH_COOKIE);
  return flow;
}
