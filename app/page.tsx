import Link from "next/link";
import Image from "next/image";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  not_allowed: "你的 Discord 帳號不在我們的社群名單中，無法使用本服務。",
  login_expired: "登入逾時，請再試一次。",
  invalid_state: "登入驗證失敗，請再試一次。",
  token_exchange_failed: "登入時發生錯誤，請再試一次。",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSession();
  const { error } = await searchParams;
  const errorText = error ? ERROR_MESSAGES[error] ?? decodeURIComponent(error) : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-12 px-6 py-16">
      {errorText && (
        <div className="animate-fade-in rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {errorText}
        </div>
      )}

      <div className="flex flex-col gap-5">
        <div className="animate-fade-up relative w-fit">
          <div className="absolute inset-0 -z-10 rounded-3xl bg-amber-400/25 blur-2xl" />
          <Image
            src="/assets/openpoint_free.webp"
            alt="OpenPoint 代轉"
            width={72}
            height={72}
            priority
            className="h-16 w-16 rounded-2xl object-cover shadow-[0_10px_30px_-12px_rgba(245,158,11,0.8)] ring-1 ring-white/10 sm:h-[72px] sm:w-[72px]"
          />
        </div>
        <span className="animate-fade-up flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-3 py-1 text-xs text-zinc-300">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
          </span>
          僅限社群成員 · Discord 登入
        </span>
        <h1 className="animate-fade-up text-4xl font-semibold leading-tight tracking-tight [animation-delay:60ms] sm:text-5xl">
          OpenPoint 代轉
          <br />
          <span className="text-gradient-amber">填手機、選點數、付款</span>，核准後直接入帳。
        </h1>
        <p className="animate-fade-up max-w-xl text-lg leading-8 text-zinc-400 [animation-delay:120ms]">
          這是給朋友用的 OpenPoint 代轉小工具。OpenPoint 可以用手機號碼互轉——你提出申請、用社群點數付款，
          我核准後就會把 OpenPoint 轉到你填的手機號碼。1 點 = 1 元 = 1 OpenPoint。
        </p>

        <div className="animate-fade-up flex flex-wrap items-center gap-3 pt-2 [animation-delay:180ms]">
          {user ? (
            <Link
              href="/apply"
              className="btn-amber rounded-full px-6 py-3 font-medium"
            >
              開始申請
            </Link>
          ) : (
            <a
              href="/api/auth/login"
              className="rounded-full bg-[#5865F2] px-6 py-3 font-medium text-white shadow-[0_10px_30px_-10px_rgba(88,101,242,0.9)] transition-all hover:-translate-y-0.5 hover:bg-[#4752c4]"
            >
              使用 Discord 登入
            </a>
          )}
          <Link
            href="/status"
            className="rounded-full border border-white/20 px-6 py-3 font-medium transition-colors hover:border-white/35 hover:bg-white/5"
          >
            查看我的申請
          </Link>
        </div>
      </div>

      <ol className="grid gap-4 sm:grid-cols-4">
        {[
          ["1", "登入", "用 Discord 登入，確認你是社群成員。"],
          ["2", "填資料", "輸入要收 OpenPoint 的手機號碼與點數。"],
          ["3", "付款", "用社群點數付款（1 點 = 1 元）。"],
          ["4", "等核准", "我核准並轉入 OpenPoint，完成！"],
        ].map(([n, t, d], i) => (
          <li
            key={n}
            className="card card-hover animate-fade-up rounded-2xl p-4"
            style={{ animationDelay: `${240 + i * 80}ms` }}
          >
            <div className="grid h-8 w-8 place-items-center rounded-full bg-amber-400/15 text-sm font-semibold text-amber-300 ring-1 ring-amber-400/25">
              {n}
            </div>
            <h3 className="mt-3 font-medium">{t}</h3>
            <p className="mt-1 text-sm leading-6 text-zinc-400">{d}</p>
          </li>
        ))}
      </ol>
    </main>
  );
}
