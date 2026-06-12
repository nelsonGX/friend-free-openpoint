import { NextResponse, type NextRequest } from "next/server";
import { getSession, sessionIsAdmin } from "@/lib/session";
import { getRequest, saveRequest } from "@/lib/store";

export const runtime = "edge";

// Admin marks a paid request as completed (OpenPoint has been sent to the phone).
export async function POST(request: NextRequest) {
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
