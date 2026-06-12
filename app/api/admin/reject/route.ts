import { NextResponse, type NextRequest } from "next/server";
import { getSession, sessionIsAdmin } from "@/lib/session";
import { reversePay } from "@/lib/fga";

export const runtime = "edge";
import { getRequest, saveRequest } from "@/lib/store";

// Admin rejects a request. If the friend already paid, refund their credits via
// reverse pay (idempotent on ref), then mark the request rejected.
export async function POST(request: NextRequest) {
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

  // Refund only if the friend actually paid.
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
      : `已退回申請（未付款，無需退款）`,
  );
}
