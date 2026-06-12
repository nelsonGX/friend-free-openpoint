import { NextResponse, type NextRequest } from "next/server";
import {
  buildAuthorizeUrl,
  createPayIntent,
  exchangeCode,
  reversePay,
  userinfo,
  type UserInfo,
} from "@/lib/fga";
import {
  consumeOAuthFlow,
  createSession,
  destroySession,
  generatePkce,
  getSession,
  sessionIsAdmin,
  setOAuthFlow,
} from "@/lib/session";
import {
  getRequest,
  listAllRequests,
  listRequestsForUser,
  newId,
  saveRequest,
  type OpenPointRequest,
} from "@/lib/store";

export const runtime = "edge";

const PHONE_RE = /^09\d{8}$/;
const MAX_AMOUNT = 50000;

type ApiContext = {
  params: Promise<{ path?: string[] }>;
};

function pathOf(path: string[] | undefined): string {
  return `/${(path ?? []).join("/")}`;
}

function notFound() {
  return NextResponse.json({ error: "not_found" }, { status: 404 });
}

async function sessionResponse() {
  const user = await getSession();

  return NextResponse.json({
    user: user
      ? {
          sub: user.sub,
          username: user.username,
          globalName: user.globalName,
          avatar: user.avatar,
          discordId: user.discordId,
          isAdmin: sessionIsAdmin(user),
        }
      : null,
  });
}

async function myRequestsResponse() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ requests: await listRequestsForUser(user.sub) });
}

async function requestResponse(id: string) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const record = await getRequest(id);
  if (!record || record.sub !== user.sub) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ request: record });
}

async function adminRequestsResponse() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!sessionIsAdmin(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return NextResponse.json({ requests: await listAllRequests() });
}

async function loginResponse(request: NextRequest) {
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

async function callbackResponse(request: NextRequest) {
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

async function logoutResponse(request: NextRequest) {
  await destroySession();
  return NextResponse.redirect(new URL("/", request.nextUrl.origin), { status: 303 });
}

async function createRequestResponse(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { phone?: unknown; amount?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const amount =
    typeof body.amount === "number"
      ? body.amount
      : Number.parseInt(String(body.amount ?? ""), 10);

  if (!PHONE_RE.test(phone)) {
    return NextResponse.json(
      { error: "invalid_phone", message: "請輸入有效的手機號碼（09 開頭，共 10 碼）。" },
      { status: 400 },
    );
  }
  if (!Number.isInteger(amount) || amount < 1 || amount > MAX_AMOUNT) {
    return NextResponse.json(
      { error: "invalid_amount", message: `點數需為 1 至 ${MAX_AMOUNT} 之間的整數。` },
      { status: 400 },
    );
  }

  const id = newId();
  const ref = `op-${id}`;
  const now = Date.now();

  const record: OpenPointRequest = {
    id,
    sub: user.sub,
    username: user.username,
    globalName: user.globalName,
    discordId: user.discordId,
    phone,
    amount,
    ref,
    intentId: null,
    status: "pending_payment",
    createdAt: now,
    paidAt: null,
    decidedAt: null,
    adminNote: null,
    refundRef: null,
  };

  try {
    const intent = await createPayIntent({
      amount,
      ref,
      redirectUri: `${request.nextUrl.origin}/pay/return`,
      description: `OpenPoint ${amount} 點 → ${phone}`,
      state: id,
    });
    record.intentId = intent.intent_id;
    await saveRequest(record);
    return NextResponse.json({ id, url: intent.url });
  } catch (e) {
    console.error("createPayIntent failed", e);
    return NextResponse.json(
      { error: "payment_init_failed", message: "建立付款時發生錯誤，請稍後再試。" },
      { status: 502 },
    );
  }
}

async function approveResponse(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const user = await getSession();
  if (!sessionIsAdmin(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const form = await request.formData();
  const id = String(form.get("id") ?? "");
  const record = await getRequest(id);

  const back = (msg: string) =>
    NextResponse.redirect(new URL(`/admin?msg=${encodeURIComponent(msg)}`, origin), {
      status: 303,
    });

  if (!record) return back("找不到該申請");
  if (record.status !== "awaiting_approval") {
    return back("此申請不是待核准狀態，未變更");
  }

  record.status = "completed";
  record.decidedAt = Date.now();
  record.adminNote = "已轉入 OpenPoint";
  await saveRequest(record);

  return back(`已核准 ${record.amount} 點 → ${record.phone}`);
}

async function rejectResponse(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const user = await getSession();
  if (!sessionIsAdmin(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const form = await request.formData();
  const id = String(form.get("id") ?? "");
  const note = String(form.get("note") ?? "").trim() || "申請已被退回";
  const record = await getRequest(id);

  const back = (msg: string) =>
    NextResponse.redirect(new URL(`/admin?msg=${encodeURIComponent(msg)}`, origin), {
      status: 303,
    });

  if (!record) return back("找不到該申請");
  if (record.status === "completed") return back("此申請已完成，無法退款");
  if (record.status === "rejected") return back("此申請已退款");

  if (record.status === "awaiting_approval") {
    const refundRef = `refund-${record.id}`;
    try {
      await reversePay({
        userId: record.sub,
        amount: record.amount,
        ref: refundRef,
        description: `OpenPoint 代轉退款：${note}`,
      });
      record.refundRef = refundRef;
    } catch (e) {
      const err = e as { status?: number };
      if (err.status === 402) {
        return back("退款失敗：App 餘額不足，請先到 Friend Group Auth 後台儲值再退款");
      }
      console.error("reversePay failed", e);
      return back("退款失敗：付款系統錯誤，請稍後再試（尚未變更狀態）");
    }
  }

  record.status = "rejected";
  record.decidedAt = Date.now();
  record.adminNote = note;
  await saveRequest(record);

  return back(
    record.refundRef
      ? `已退款 ${record.amount} 點給 ${record.username}`
      : "已退回申請（未付款，無需退款）",
  );
}

export async function GET(request: NextRequest, context: ApiContext) {
  const path = pathOf((await context.params).path);

  if (path === "/session") return sessionResponse();
  if (path === "/my-requests") return myRequestsResponse();
  if (path === "/admin/requests") return adminRequestsResponse();
  if (path === "/auth/login") return loginResponse(request);
  if (path === "/auth/callback") return callbackResponse(request);

  const requestMatch = path.match(/^\/requests\/([^/]+)$/);
  if (requestMatch) return requestResponse(requestMatch[1]);

  return notFound();
}

export async function POST(request: NextRequest, context: ApiContext) {
  const path = pathOf((await context.params).path);

  if (path === "/requests") return createRequestResponse(request);
  if (path === "/admin/approve") return approveResponse(request);
  if (path === "/admin/reject") return rejectResponse(request);
  if (path === "/auth/logout") return logoutResponse(request);

  return notFound();
}
