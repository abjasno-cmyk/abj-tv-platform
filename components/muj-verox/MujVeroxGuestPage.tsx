"use client";

import Link from "next/link";

import { MujVeroxMobilePublic } from "@/components/muj-verox/MujVeroxMobilePublic";

export function MujVeroxGuestPage() {
  return (
    <div className="verox-muj-verox-page">
      <MujVeroxMobilePublic />
      <main className="verox-live-desktop-only mx-auto w-full max-w-4xl px-4 py-8">
        <section className="rounded-2xl border border-[var(--abj-gold-dim)] bg-white p-6 shadow-[0_10px_24px_rgba(17,17,17,0.08)]">
          <p className="text-xs uppercase tracking-[0.14em] text-abj-text2">Můj Verox</p>
          <h1 className="mt-2 text-3xl font-extrabold text-abj-text1">Váš bezplatný divácký účet</h1>
          <p className="mt-3 max-w-2xl text-sm text-abj-text2">
            Přihlaste se zdarma a získejte sekce Rozkoukáno, Zhlédnuto, oblíbené kanály i osobní diskusi.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/live"
              className="inline-flex min-h-10 items-center rounded-full border border-[#FF6A00] bg-[#FF6A00] px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white"
            >
              Přihlásit zdarma
            </Link>
            <span className="inline-flex min-h-10 items-center rounded-full border border-[var(--abj-gold-dim)] px-4 py-2 text-xs text-abj-text2">
              Sledování obsahu zůstává zdarma.
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}
