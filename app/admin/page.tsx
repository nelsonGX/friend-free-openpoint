import { redirect } from "next/navigation";
import { getSession, sessionIsAdmin } from "@/lib/session";
import { listAllRequests, type OpenPointRequest } from "@/lib/store";
import { STATUS_LABEL, STATUS_CLASS, formatDateTime } from "@/lib/status";

export const runtime = "edge";
export const dynamic = "force-dynamic";

function RequestRow({ r, actionable }: { r: OpenPointRequest; actionable: boolean }) {
  return (
    <li className="card rounded-2xl p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-semibold">{r.amount} 點</span>
            <span className="text-sm text-zinc-400">→ {r.phone}</span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {r.globalName || r.username} · 申請 {formatDateTime(r.createdAt)}
            {r.paidAt ? ` · 付款 ${formatDateTime(r.paidAt)}` : ""}
            {r.decidedAt ? ` · 處理 ${formatDateTime(r.decidedAt)}` : ""}
          </p>
          {r.adminNote && r.status !== "awaiting_approval" && (
            <p className="mt-1 text-xs text-zinc-400">備註：{r.adminNote}</p>
          )}
        </div>
        <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${STATUS_CLASS[r.status]}`}>
          {STATUS_LABEL[r.status]}
        </span>
      </div>

      {actionable && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
          <form action="/api/admin/approve" method="post">
            <input type="hidden" name="id" value={r.id} />
            <button
              type="submit"
              className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-black shadow-[0_8px_22px_-10px_rgba(16,185,129,0.8)] transition-all hover:-translate-y-0.5 hover:bg-emerald-400"
            >
              已轉入 · 核准
            </button>
          </form>
          <form action="/api/admin/reject" method="post" className="flex items-center gap-2">
            <input type="hidden" name="id" value={r.id} />
            <input
              name="note"
              placeholder="退款原因（選填）"
              className="w-44 rounded-full border border-white/15 bg-white/[0.03] px-3 py-2 text-sm outline-none transition-colors focus:border-red-400/60 focus:ring-2 focus:ring-red-400/15"
            />
            <button
              type="submit"
              className="rounded-full border border-red-500/50 px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10"
            >
              退款 · 退回
            </button>
          </form>
        </div>
      )}
    </li>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/api/auth/login?returnTo=/admin");
  if (!sessionIsAdmin(user)) redirect("/");

  const { msg } = await searchParams;
  const all = await listAllRequests();
  const pending = all.filter((r) => r.status === "awaiting_approval");
  const history = all.filter((r) => r.status === "completed" || r.status === "rejected");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-12">
      <h1 className="animate-fade-up text-2xl font-semibold tracking-tight">管理後台</h1>

      {msg && (
        <div className="animate-fade-in rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {decodeURIComponent(msg)}
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-400">
          待核准（{pending.length}）— 請先在 OpenPoint App 轉帳，再按「核准」
        </h2>
        {pending.length === 0 ? (
          <p className="card rounded-2xl px-4 py-10 text-center text-zinc-500">
            目前沒有待核准的申請。
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pending.map((r) => (
              <RequestRow key={r.id} r={r} actionable />
            ))}
          </ul>
        )}
      </section>

      {history.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-400">歷史紀錄</h2>
          <ul className="flex flex-col gap-3">
            {history.map((r) => (
              <RequestRow key={r.id} r={r} actionable={false} />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
