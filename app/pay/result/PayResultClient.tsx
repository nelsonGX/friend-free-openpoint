"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { OpenPointRequest } from "@/lib/store";

type Outcome = { title: string; message: string; tone: "ok" | "warn" | "error" };

function outcomeFor(status: string, detail: string): Outcome {
  switch (status) {
    case "ok":
      return {
        tone: "ok",
        title: "付款成功，等待核准",
        message: `已收到付款${detail}。我們會盡快把 OpenPoint 轉入指定號碼，完成後狀態會更新為「已完成」。`,
      };
    case "cancelled":
      return {
        tone: "warn",
        title: "付款已取消",
        message: "你取消了這次付款，沒有任何扣款。可以回到首頁重新申請。",
      };
    case "insufficient":
      return {
        tone: "warn",
        title: "點數不足",
        message: "你的點數餘額不足以完成這次付款，請先儲值後再試。",
      };
    case "pending":
      return {
        tone: "warn",
        title: "尚未完成付款",
        message: "這次付款尚未完成。如果你已經付款，請稍候到「我的申請」重新整理查看。",
      };
    case "login":
      return { tone: "warn", title: "請先登入", message: "請先使用 Discord 登入後再查看付款結果。" };
    case "error":
      return {
        tone: "error",
        title: "驗證付款時發生錯誤",
        message: "我們暫時無法向付款系統確認狀態，請稍後到「我的申請」查看，或稍候再試。",
      };
    default:
      return {
        tone: "error",
        title: "找不到付款資訊",
        message: "我們找不到對應的申請，請回到首頁重新申請。",
      };
  }
}

export default function PayResultClient() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "notfound";
  const id = searchParams.get("id");
  const [detail, setDetail] = useState("");

  useEffect(() => {
    if (status !== "ok" || !id) return;

    let active = true;
    fetch(`/api/requests/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { request?: OpenPointRequest } | null) => {
        if (!active || !data?.request) return;
        setDetail(`（${data.request.amount} 點 → ${data.request.phone}）`);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [id, status]);

  const { title, message, tone } = outcomeFor(status, detail);
  const toneClass =
    tone === "ok"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : tone === "warn"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
        : "border-red-500/40 bg-red-500/10 text-red-300";

  const icon = tone === "ok" ? "✓" : tone === "warn" ? "!" : "✕";

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div className={`animate-fade-up rounded-2xl border p-6 backdrop-blur-sm ${toneClass}`}>
        <div className="flex items-start gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-current/30 bg-current/10 text-lg font-bold">
            {icon}
          </span>
          <div>
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="mt-2 text-sm leading-6 opacity-90">{message}</p>
          </div>
        </div>
      </div>
      <div className="animate-fade-up flex gap-3 [animation-delay:80ms]">
        <Link
          href="/status"
          className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition-all hover:-translate-y-0.5 hover:bg-zinc-200"
        >
          我的申請
        </Link>
        <Link
          href="/apply"
          className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium transition-colors hover:border-white/35 hover:bg-white/10"
        >
          再次申請
        </Link>
      </div>
    </main>
  );
}
