"use client";

type QuickActionsProps = {
  onNextTopic: () => void;
  onStayOnTopic: () => void;
  onShowContext: () => void;
};

export function QuickActions({ onNextTopic, onStayOnTopic, onShowContext }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <button
        type="button"
        onClick={onNextTopic}
        className="rounded-xl border border-[#2B67B0] bg-[linear-gradient(160deg,#0F2B4C,#0A1B31)] px-4 py-3 text-left text-sm font-semibold text-[#D9E9FF] shadow-[0_10px_20px_rgba(3,12,24,0.4)] transition hover:border-[#4D8EE0] active:scale-[0.98]"
      >
        Next topic →
      </button>
      <button
        type="button"
        onClick={onStayOnTopic}
        className="rounded-xl border border-[#7A5A1D] bg-[linear-gradient(160deg,#2A1E0C,#1A140A)] px-4 py-3 text-left text-sm font-semibold text-[#F7DEA7] shadow-[0_10px_20px_rgba(0,0,0,0.35)] transition hover:border-[#B9872C] active:scale-[0.98]"
      >
        Stay on topic
      </button>
      <button
        type="button"
        onClick={onShowContext}
        className="rounded-xl border border-[#8A2E73] bg-[linear-gradient(160deg,#301329,#1F0E1C)] px-4 py-3 text-left text-sm font-semibold text-[#F3CBEA] shadow-[0_10px_20px_rgba(0,0,0,0.35)] transition hover:border-[#C24EA6] active:scale-[0.98]"
      >
        Show context
      </button>
    </div>
  );
}
