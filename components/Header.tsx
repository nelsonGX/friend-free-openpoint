"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface SessionUser {
  username: string;
  globalName: string | null;
  isAdmin: boolean;
}

export default function Header() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const name = user?.globalName || user?.username || "";

  useEffect(() => {
    let active = true;
    fetch("/api/session", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        setUser(data?.user ?? null);
        setLoaded(true);
      })
      .catch(() => {
        if (!active) return;
        setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <header className="glass sticky top-0 z-50 border-b border-white/10">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-3.5">
        <Link
          href="/"
          className="group flex items-center gap-2.5 font-semibold tracking-tight"
        >
          <img
            src="/assets/openpoint_free.webp"
            alt="OpenPoint 代轉"
            width={32}
            height={32}
            className="h-8 w-8 rounded-xl object-cover shadow-[0_4px_14px_-4px_rgba(245,158,11,0.7)] ring-1 ring-white/10 transition-transform group-hover:scale-105"
          />
          <span className="transition-colors group-hover:text-amber-200">OpenPoint 代轉</span>
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          {loaded && user ? (
            <>
              <Link href="/apply" className="rounded-full px-3 py-1.5 hover:bg-white/10">
                申請
              </Link>
              <Link href="/status" className="rounded-full px-3 py-1.5 hover:bg-white/10">
                我的申請
              </Link>
              {user.isAdmin && (
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
          ) : loaded ? (
            <Link
              href="/api/auth/login"
              className="rounded-full bg-[#5865F2] px-4 py-1.5 font-medium text-white shadow-[0_6px_18px_-8px_rgba(88,101,242,0.9)] transition-colors hover:bg-[#4752c4]"
            >
              使用 Discord 登入
            </Link>
          ) : (
            <span className="h-8 w-24 rounded-full border border-white/10 bg-white/[0.03]" />
          )}
        </nav>
      </div>
    </header>
  );
}
