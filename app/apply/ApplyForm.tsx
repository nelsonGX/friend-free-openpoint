"use client";

import { useState } from "react";
import { PRESET_AMOUNTS } from "@/lib/status";

export default function ApplyForm() {
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState<number | "">(PRESET_AMOUNTS[1]);
  const [custom, setCustom] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneValid = /^09\d{8}$/.test(phone);
  const amountValid = typeof amount === "number" && Number.isInteger(amount) && amount >= 1 && amount <= 50000;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!phoneValid) return setError("請輸入有效的手機號碼（09 開頭，共 10 碼）。");
    if (!amountValid) return setError("請輸入 1 至 50000 之間的點數。");

    setSubmitting(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, amount }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setError(data.message ?? "建立申請失敗，請稍後再試。");
        setSubmitting(false);
        return;
      }
      // Hand off to Friend Group Auth's hosted payment page.
      window.location.href = data.url;
    } catch {
      setError("網路錯誤，請稍後再試。");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="phone" className="text-sm font-medium">
          收款手機號碼（OpenPoint 帳號）
        </label>
        <input
          id="phone"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="0912345678"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
          className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-lg tracking-wide outline-none focus:border-amber-400/60"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">點數（1 點 = 1 元 = 1 OpenPoint）</span>
        <div className="grid grid-cols-4 gap-2">
          {PRESET_AMOUNTS.map((v) => {
            const active = !custom && amount === v;
            return (
              <button
                type="button"
                key={v}
                onClick={() => {
                  setCustom(false);
                  setAmount(v);
                }}
                className={`rounded-xl border px-3 py-3 text-center font-medium transition-colors ${
                  active
                    ? "border-amber-400 bg-amber-400/15 text-amber-200"
                    : "border-white/15 hover:bg-white/5"
                }`}
              >
                {v}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => {
            setCustom(true);
            setAmount("");
          }}
          className={`mt-1 w-fit text-sm ${custom ? "text-amber-300" : "text-zinc-400 hover:text-zinc-200"}`}
        >
          自訂金額
        </button>
        {custom && (
          <input
            inputMode="numeric"
            placeholder="輸入點數，例如 250"
            value={amount}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value.replace(/\D/g, ""), 10);
              setAmount(Number.isNaN(n) ? "" : n);
            }}
            className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-lg outline-none focus:border-amber-400/60"
          />
        )}
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !phoneValid || !amountValid}
        className="rounded-full bg-amber-400 px-6 py-3 font-medium text-black transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting
          ? "前往付款…"
          : `付款 ${amountValid ? amount : ""} 點並送出申請`}
      </button>
      <p className="text-center text-xs text-zinc-500">
        付款由 Friend Group Auth 點數系統處理，核准後 OpenPoint 會轉入你填寫的手機號碼。
      </p>
    </form>
  );
}
