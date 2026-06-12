// Server-side environment configuration. Never import this from client components
// (it reads AUTH_CLIENT_SECRET, which must never reach the browser bundle).

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Missing required env var ${name}. Did you run the Friend Group Auth skill / fill .env.local?`,
    );
  }
  return v;
}

export const env = {
  authBaseUrl: required("AUTH_BASE_URL"),
  clientId: required("AUTH_CLIENT_ID"),
  clientSecret: required("AUTH_CLIENT_SECRET"),
  // Fallback redirect URI; the live routes prefer one derived from the request origin
  // so the same build works on both localhost and production.
  authRedirectUri: process.env.AUTH_REDIRECT_URI ?? "",
  sessionSecret: required("SESSION_SECRET"),
  adminDiscordIds: (process.env.ADMIN_DISCORD_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};

export function isAdminDiscordId(discordId: string | undefined | null): boolean {
  if (!discordId) return false;
  return env.adminDiscordIds.includes(discordId);
}
