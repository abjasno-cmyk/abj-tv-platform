"use client";

import { useHealth } from "@/hooks/useHealth";

function statusTone(status: string | undefined): string {
  if (status === "ok") return "text-[#2D7B38]";
  if (status === "warning") return "text-[#8A6A00]";
  return "text-[#A11822]";
}

export function ReplitHealthBadge() {
  const { health, loading } = useHealth();
  const status = health?.status ?? (loading ? "loading" : "error");
  const tone = statusTone(status);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(17,17,17,0.18)] bg-white px-3 py-1">
      <span className={`h-1.5 w-1.5 rounded-full ${status === "ok" ? "bg-[#2D7B38]" : "bg-[#A11822]"}`} />
      <span className="text-[10px] uppercase tracking-[0.08em] text-abj-text2">Replit</span>
      <span className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${tone}`}>{status}</span>
    </div>
  );
}
