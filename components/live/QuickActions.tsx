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
        className="rounded-xl border border-[#1f3556] bg-[#0d1d33] px-4 py-3 text-left text-sm text-[#d3def0] transition hover:border-[#2e5b9a]"
      >
        Next topic →
      </button>
      <button
        type="button"
        onClick={onStayOnTopic}
        className="rounded-xl border border-[#3c2a10] bg-[#1b1409] px-4 py-3 text-left text-sm text-[#f5d9a4] transition hover:border-[#8f5d1d]"
      >
        Stay on topic
      </button>
      <button
        type="button"
        onClick={onShowContext}
        className="rounded-xl border border-[#3b1235] bg-[#200f1f] px-4 py-3 text-left text-sm text-[#f2c8ea] transition hover:border-[#9d3d87]"
      >
        Show context
      </button>
    </div>
  );
}
