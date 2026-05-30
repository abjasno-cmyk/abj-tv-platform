"use client";

export function StudioFab() {
  return (
    <div className="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => {
          window.location.href = "/studio";
        }}
        className="rounded-full border border-[#F37021] bg-[#F37021] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(0,0,0,0.28)] transition hover:bg-[#e95f00] disabled:cursor-not-allowed disabled:opacity-60"
      >
        Studio
      </button>
      <p className="max-w-[280px] rounded-lg border border-[#2f3647] bg-[#0f131b] px-3 py-2 text-[11px] text-[#c2cee2]">
        Studio preview je dostupné bez přihlášení.
      </p>
    </div>
  );
}
