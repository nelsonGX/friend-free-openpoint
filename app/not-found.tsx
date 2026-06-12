import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div className="animate-fade-up rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur-sm">
        <div className="flex items-start gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-lg font-bold">
            ?
          </span>
          <div>
            <h1 className="text-xl font-semibold">找不到頁面</h1>
            <p className="mt-2 text-sm leading-6 opacity-80">
              你要找的頁面不存在或已被移除。回到首頁重新開始吧。
            </p>
          </div>
        </div>
      </div>
      <div className="animate-fade-up [animation-delay:80ms]">
        <Link
          href="/"
          className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition-all hover:-translate-y-0.5 hover:bg-zinc-200"
        >
          回到首頁
        </Link>
      </div>
    </main>
  );
}
