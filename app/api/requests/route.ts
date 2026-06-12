import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { createPayIntent } from "@/lib/fga";
import { newId, saveRequest, type OpenPointRequest } from "@/lib/store";

export const runtime = "edge";

const PHONE_RE = /^09\d{8}$/; // Taiwan mobile number (OpenPoint account)
const MAX_AMOUNT = 50000;

// Create a new OpenPoint request and a payment intent, then hand back the pay URL.
export async function POST(request: NextRequest) {
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
    const origin = request.nextUrl.origin;
    const intent = await createPayIntent({
      amount,
      ref,
      redirectUri: `${origin}/pay/return`,
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
