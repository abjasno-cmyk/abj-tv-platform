"use client";

// NOTE: V2 keeps V1 chat logic untouched; only styling is updated.
export function ChatPanel() {
  return (
    <section className="flex min-h-[480px] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md lg:h-full">
      <header className="border-b border-[var(--border)] px-4 py-3">
        <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-soft)]">Hospoda</p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <p className="py-1.5 text-base text-[var(--text-main)]">
          Chat v0.2: základní placeholder. Realtime funkce doplníme v další verzi.
        </p>
      </div>

      <footer className="border-t border-[var(--border)] px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="Napište zprávu..."
            className="min-h-12 w-full rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.06)] px-4 py-3 text-base text-[var(--text-main)] placeholder:text-[var(--text-soft)] outline-none"
          />
          <button
            type="button"
            className="min-h-12 rounded-xl bg-[var(--accent-blue)] px-5 py-3 text-base text-white transition-all duration-200 ease-out hover:bg-blue-500"
          >
            Odeslat
          </button>
        </div>
      </footer>
    </section>
  );
}
