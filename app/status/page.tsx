import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listRequestsForUser } from "@/lib/store";
import { STATUS_LABEL, STATUS_CLASS, formatDateTime } from "@/lib/status";

export const runtime = "edge";

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const user = await getSession();
  if (!user) {
    redirect("/api/auth/login?returnTo=/status");
  }

  const requests = await listRequestsForUser(user.sub);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
      <div className="animate-fade-up flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">我的申請</h1>
        <Link
          href="/apply"
          className="btn-amber rounded-full px-4 py-2 text-sm font-medium"
        >
          新申請
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="card animate-fade-up flex flex-col items-center gap-1 rounded-2xl px-4 py-14 text-center">
          <p className="text-zinc-300">還沒有任何申請</p>
          <p className="text-sm text-zinc-500">點「新申請」開始吧！</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {requests.map((r, i) => (
            <li
              key={r.id}
              className="card card-hover animate-fade-up flex items-center justify-between rounded-2xl px-4 py-4"
              style={{ animationDelay: `${i * 60}ms` }}
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
