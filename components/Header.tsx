import Link from "next/link";
import { getSession, sessionIsAdmin } from "@/lib/session";

export default async function Header() {
  const user = await getSession();
  const isAdmin = sessionIsAdmin(user);
  const name = user?.globalName || user?.username || "";

  return (
    <header className="border-b border-white/10">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-400 text-sm font-bold text-black">
            P
          </span>
          OpenPoint 代轉
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          {user ? (
            <>
              <Link href="/apply" className="rounded-full px-3 py-1.5 hover:bg-white/10">
                申請
              </Link>
              <Link href="/status" className="rounded-full px-3 py-1.5 hover:bg-white/10">
                我的申請
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="rounded-full px-3 py-1.5 text-amber-300 hover:bg-white/10"
                >
                  管理
                </Link>
              )}
              <span className="ml-1 hidden text-zinc-400 sm:inline">{name}</span>
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="rounded-full border border-white/20 px-3 py-1.5 hover:bg-white/10"
                >
                  登出
                </button>
              </form>
            </>
          ) : (
            <a
              href="/api/auth/login"
              className="rounded-full bg-[#5865F2] px-4 py-1.5 font-medium text-white hover:bg-[#4752c4]"
            >
              使用 Discord 登入
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
