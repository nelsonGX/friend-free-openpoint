import { NextResponse, type NextRequest } from "next/server";
import { buildAuthorizeUrl } from "@/lib/fga";
import { generatePkce, setOAuthFlow } from "@/lib/session";

export const runtime = "edge";

// Begin the OAuth 2.0 + PKCE login. Redirects the user to Friend Group Auth.
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/callback`;
  const returnTo = request.nextUrl.searchParams.get("returnTo") ?? "/apply";

  const { verifier, challenge, state } = await generatePkce();
  await setOAuthFlow({ state, codeVerifier: verifier, returnTo });

  const authorizeUrl = buildAuthorizeUrl({
    redirectUri,
    state,
    codeChallenge: challenge,
    scopes: ["identify", "roles", "credits"],
  });

  return NextResponse.redirect(authorizeUrl);
}
