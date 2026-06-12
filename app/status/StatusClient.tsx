"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { STATUS_CLASS, STATUS_LABEL, formatDateTime } from "@/lib/status";
import type { OpenPointRequest } from "@/lib/store";

export default function StatusClient() {
  const [requests, setRequests] = useState<OpenPointRequest[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/my-requests", { cache: "no-store" })
      .then((res) => {
        if (res.status === 401) {
          window.location.href = "/api/auth/login?returnTo=/status";
          return null;
        }
        return res.ok ? res.json() : { requests: [] };
      })
      .then((data) => {
        if (!active || !data) return;
        setRequests(data.requests ?? []);
      })
      .catch(() => {
        if (!active) return;
        setRequests([]);
      });

    return () => {
      active = false;
    };
  }, []);

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

      {requests === null ? (
        <div className="card animate-fade-up rounded-2xl px-4 py-10 text-center text-zinc-500">
          載入中...
        </div>
      ) : requests.length === 0 ? (
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
