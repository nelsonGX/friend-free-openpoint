import type { RequestStatus } from "@/lib/store";

export const STATUS_LABEL: Record<RequestStatus, string> = {
  pending_payment: "待付款",
  awaiting_approval: "待核准",
  completed: "已完成",
  rejected: "已退款",
};

export const STATUS_CLASS: Record<RequestStatus, string> = {
  pending_payment: "border-zinc-500/40 bg-zinc-500/10 text-zinc-300",
  awaiting_approval: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  completed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  rejected: "border-red-500/40 bg-red-500/10 text-red-300",
};

export const PRESET_AMOUNTS = [50, 100, 300, 500] as const;

export function formatDateTime(ms: number | null): string {
  if (!ms) return "—";
  // Stable, locale-independent formatting (avoids server/client hydration drift).
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
