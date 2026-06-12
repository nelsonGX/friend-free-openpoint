import Link from "next/link";
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
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-6 py-16">
      {errorText && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {errorText}
        </div>
      )}

      <div className="flex flex-col gap-5">
        <span className="w-fit rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-400">
          僅限社群成員 · Discord 登入
        </span>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          OpenPoint 代轉
          <br />
          <span className="text-amber-400">填手機、選點數、付款</span>，核准後直接入帳。
        </h1>
        <p className="max-w-xl text-lg leading-8 text-zinc-400">
          這是給朋友用的 OpenPoint 代轉小工具。OpenPoint 可以用手機號碼互轉——你提出申請、用社群點數付款，
          我核准後就會把 OpenPoint 轉到你填的手機號碼。1 點 = 1 元 = 1 OpenPoint。
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          {user ? (
            <Link
              href="/apply"
              className="rounded-full bg-amber-400 px-6 py-3 font-medium text-black hover:bg-amber-300"
            >
              開始申請
            </Link>
          ) : (
            <a
              href="/api/auth/login"
              className="rounded-full bg-[#5865F2] px-6 py-3 font-medium text-white hover:bg-[#4752c4]"
            >
              使用 Discord 登入
            </a>
          )}
          <Link
            href="/status"
            className="rounded-full border border-white/20 px-6 py-3 font-medium hover:bg-white/10"
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
        ].map(([n, t, d]) => (
          <li key={n} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="grid h-7 w-7 place-items-center rounded-full bg-amber-400/20 text-sm font-semibold text-amber-300">
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
