import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listRequestsForUser } from "@/lib/store";
import { STATUS_LABEL, STATUS_CLASS, formatDateTime } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const user = await getSession();
  if (!user) {
    redirect("/api/auth/login?returnTo=/status");
  }

  const requests = await listRequestsForUser(user.sub);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">我的申請</h1>
        <Link
          href="/apply"
          className="rounded-full bg-amber-400 px-4 py-2 text-sm font-medium text-black hover:bg-amber-300"
        >
          新申請
        </Link>
      </div>

      {requests.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-10 text-center text-zinc-400">
          還沒有任何申請。點「新申請」開始吧！
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {requests.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-4"
            >
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-semibold">{r.amount} 點</span>
                  <span className="text-sm text-zinc-400">→ {r.phone}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  申請於 {formatDateTime(r.createdAt)}
                  {r.status === "rejected" && r.adminNote ? ` · ${r.adminNote}` : ""}
                </p>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${STATUS_CLASS[r.status]}`}
              >
                {STATUS_LABEL[r.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
