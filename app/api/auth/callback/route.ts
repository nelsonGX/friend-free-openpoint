import { NextResponse, type NextRequest } from "next/server";
import { exchangeCode, userinfo, type UserInfo } from "@/lib/fga";
import { consumeOAuthFlow, createSession } from "@/lib/session";

// OAuth callback: verify state, exchange the code, check membership, open a session.
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const params = request.nextUrl.searchParams;
  const error = params.get("error");
  const code = params.get("code");
  const state = params.get("state");

  const flow = await consumeOAuthFlow();

  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/?error=${encodeURIComponent(reason)}`, origin));

  if (error) return fail(params.get("error_description") || error);
  if (!flow) return fail("login_expired");
  if (!code || !state || state !== flow.state) return fail("invalid_state");

  let user: UserInfo;
  try {
    const redirectUri = `${origin}/api/auth/callback`;
    const tokens = await exchangeCode({
      code,
      redirectUri,
      codeVerifier: flow.codeVerifier,
    });
    user = await userinfo(tokens.access_token);
  } catch {
    return fail("token_exchange_failed");
  }

  // Gate: only members of our group with access may enter.
  if (!user.allowed) {
    return NextResponse.redirect(new URL("/?error=not_allowed", origin));
  }

  await createSession({
    sub: user.sub,
    username: user.username,
    globalName: user.global_name,
    avatar: user.avatar,
    discordId: user.discord_id,
    allowed: true,
  });

  const returnTo = flow.returnTo && flow.returnTo.startsWith("/") ? flow.returnTo : "/apply";
  return NextResponse.redirect(new URL(returnTo, origin));
}
