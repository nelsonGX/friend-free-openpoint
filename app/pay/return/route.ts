import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { verifyPay } from "@/lib/fga";

export const runtime = "edge";
import { getRequest, saveRequest } from "@/lib/store";

// Payment return URL. The payment page redirects the browser here (GET) with
// ?intent_id&ref&status&state. We re-verify server-side, grant/flip state, then
// redirect to a pure result page. Mutations live here, never in page render.
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const sp = request.nextUrl.searchParams;
  const id = sp.get("state") ?? sp.get("ref")?.replace(/^op-/, "") ?? "";
  const intentId = sp.get("intent_id");

  const result = (status: string) =>
    NextResponse.redirect(
      new URL(`/pay/result?status=${status}&id=${encodeURIComponent(id)}`, origin),
    );

  const user = await getSession();
  if (!user) return result("login");
  if (!id) return result("notfound");

  const record = await getRequest(id);
  if (!record || record.sub !== user.sub) return result("notfound");

  try {
    const verify = await verifyPay(intentId ?? record.intentId ?? "");
    if (verify.paid && verify.user_id === user.sub) {
      if (record.status === "pending_payment") {
        record.status = "awaiting_approval";
        record.paidAt = Date.now();
        await saveRequest(record);
      }
      return result("ok");
    }
    if (verify.status === "cancelled") return result("cancelled");
    if (verify.status === "insufficient_funds") return result("insufficient");
    return result("pending");
  } catch (e) {
    console.error("verifyPay failed", e);
    return result("error");
  }
}
