import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import ApplyForm from "./ApplyForm";

export const dynamic = "force-dynamic";

export default async function ApplyPage() {
  const user = await getSession();
  if (!user) {
    redirect("/api/auth/login?returnTo=/apply");
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">申請 OpenPoint 代轉</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          填寫要收 OpenPoint 的手機號碼與點數，付款後等待核准。1 點 = 1 元 = 1 OpenPoint。
        </p>
      </div>
      <ApplyForm />
    </main>
  );
}
