"use client";

// NOTE: V2 keeps V1 chat logic untouched; only styling is updated.
export function ChatPanel() {
  return (
    <section className="flex min-h-[360px] flex-col overflow-hidden rounded-[30px] border border-[rgba(17,17,17,0.14)] bg-[linear-gradient(180deg,#1A1D23_0%,#111318_100%)] shadow-[0_20px_38px_rgba(17,17,17,0.18)] lg:h-full">
      <header className="border-b border-white/10 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Komunita</p>
        <h3 className="mt-1 text-lg font-black text-white">Živá mediální zeď</h3>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-white/90">
          Chat v0.2: základní placeholder. Realtime funkce doplníme v další verzi.
        </p>
      </div>

      <footer className="border-t border-white/10 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="Napište zprávu..."
            className="min-h-12 w-full rounded-xl border border-white/20 bg-black/20 px-4 py-3 text-base text-white placeholder:text-white/45 outline-none focus:border-[#F37021]"
          />
          <button
            type="button"
            className="min-h-12 rounded-xl border border-[#F37021] bg-[#F37021] px-5 py-3 text-base font-semibold text-white transition-all duration-200 ease-out hover:bg-[#d86625]"
          >
            Odeslat
          </button>
        </div>
      </footer>
    </section>
  );
}
