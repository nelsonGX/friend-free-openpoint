// Signed (HMAC-SHA256) cookie sessions + PKCE/state helpers. Server-side only.
// Uses Web Crypto (crypto.subtle / getRandomValues) so the routes run on the
// Edge Runtime — node:crypto and Buffer are unavailable there.
import { cookies } from "next/headers";
import { env, isAdminDiscordId } from "@/lib/env";

const SESSION_COOKIE = "op_session";
const OAUTH_COOKIE = "op_oauth";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export interface SessionUser {
  sub: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
  discordId: string;
  allowed: boolean;
}

// --- base64url (binary-safe, no Buffer) ----------------------------------

function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// --- signing -------------------------------------------------------------

let hmacKeyPromise: Promise<CryptoKey> | null = null;
function hmacKey(): Promise<CryptoKey> {
  if (!hmacKeyPromise) {
    hmacKeyPromise = crypto.subtle.importKey(
      "raw",
      encoder.encode(env.sessionSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
  }
  return hmacKeyPromise;
}

async function sign(payload: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(), encoder.encode(payload));
  return bytesToB64url(new Uint8Array(sig));
}

// timing-safe equality (constant-time over equal-length byte arrays)
function safeEqual(a: string, b: string): boolean {
  const ab = encoder.encode(a);
  const bb = encoder.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

// `<base64url(json)>.<sig>` with an embedded expiry.
async function seal(data: object, ttlSeconds: number): Promise<string> {
  const body = { ...data, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const payload = bytesToB64url(encoder.encode(JSON.stringify(body)));
  return `${payload}.${await sign(payload)}`;
}

async function unseal<T>(token: string | undefined): Promise<T | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!safeEqual(sig, await sign(payload))) return null;
  try {
    const obj = JSON.parse(decoder.decode(b64urlToBytes(payload)));
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
  store.set(SESSION_COOKIE, await seal(user, SESSION_TTL_SECONDS), {
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
  const user = await unseal<SessionUser & { exp: number }>(store.get(SESSION_COOKIE)?.value);
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

export async function generatePkce(): Promise<{ verifier: string; challenge: string; state: string }> {
  const verifier = bytesToB64url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(verifier));
  const challenge = bytesToB64url(new Uint8Array(digest));
  const state = bytesToB64url(crypto.getRandomValues(new Uint8Array(16)));
  return { verifier, challenge, state };
}

export async function setOAuthFlow(flow: OAuthFlowState): Promise<void> {
  const store = await cookies();
  store.set(OAUTH_COOKIE, await seal(flow, 600), {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
}

export async function consumeOAuthFlow(): Promise<OAuthFlowState | null> {
  const store = await cookies();
  const flow = await unseal<OAuthFlowState & { exp: number }>(store.get(OAUTH_COOKIE)?.value);
  store.delete(OAUTH_COOKIE);
  return flow;
}
