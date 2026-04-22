"use client";

import { useHealth } from "@/hooks/useHealth";

function statusTone(status: string | undefined): string {
  if (status === "ok") return "text-[#8FC197]";
  if (status === "warning") return "text-[#D9C37A]";
  return "text-[#D47B7B]";
}

export function ReplitHealthBadge() {
  const { health, loading } = useHealth();
  const status = health?.status ?? (loading ? "loading" : "error");
  const tone = statusTone(status);

  return (
    <div className="inline-flex items-center gap-2 rounded border border-[rgba(154,163,178,0.25)] bg-[rgba(6,12,23,0.6)] px-2 py-1">
      <span className={`h-1.5 w-1.5 rounded-full ${status === "ok" ? "bg-[#8FC197]" : "bg-[#D47B7B]"}`} />
      <span className="text-[10px] uppercase tracking-[0.08em] text-abj-text2">Replit</span>
      <span className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${tone}`}>{status}</span>
    </div>
  );
}
