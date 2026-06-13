import type { Metadata } from "next";
import Link from "next/link";

import { SourcesAdminBoard } from "@/components/studio/SourcesAdminBoard";
import { StudioLiveCommentsLogin } from "@/components/studio/StudioLiveCommentsLogin";
import { hasStudioCapability, resolveStudioAccessContext } from "@/lib/studio/access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Správa kanálů • VEROX Studio",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function StudioKanalyPage() {
  const access = await resolveStudioAccessContext();

  if (!access.user) {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-10 text-[#edf2fb]">
        <section className="rounded-2xl border border-[#2f3647] bg-[#0f131b] p-6 shadow-[0_20px_45px_rgba(0,0,0,0.35)]">
          <p className="text-xs uppercase tracking-[0.18em] text-[#ff6a00]">VEROX Studio</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Správa kanálů</h1>
          <p className="mt-3 text-sm text-[#b7c1d3]">
            Pro přidávání a úpravu kanálů se přihlaste přes Google účet <strong>abjasno@gmail.com</strong>.
          </p>
          <StudioLiveCommentsLogin />
          <p className="mt-4 text-xs text-[#8fa0bb]">
            Po přihlášení se stránka automaticky odemkne. Odkaz: <code>/studio/kanaly</code>
          </p>
        </section>
      </main>
    );
  }

  if (!access.canAccessStudio) {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-10 text-[#edf2fb]">
        <section className="rounded-2xl border border-[#7a3d2b] bg-[#2a1814] p-6">
          <h1 className="text-xl font-semibold text-white">Přístup odepřen</h1>
          <p className="mt-3 text-sm text-[#ffcebd]">
            Přihlášený účet ({access.email ?? "neznámý"}) nemá oprávnění ke správě kanálů. Použijte Google účet{" "}
            <strong>abjasno@gmail.com</strong>.
          </p>
          <Link href="/kanaly" className="mt-4 inline-flex text-xs text-[#ffd0ad] underline">
            Zpět na kanály
          </Link>
        </section>
      </main>
    );
  }

  if (!hasStudioCapability(access, "video_channel_edit")) {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-10 text-[#edf2fb]">
        <section className="rounded-2xl border border-[#7a3d2b] bg-[#2a1814] p-6">
          <h1 className="text-xl font-semibold text-white">Nedostatečná role</h1>
          <p className="mt-3 text-sm text-[#ffcebd]">Váš účet nemá oprávnění spravovat kanály.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-6 text-[#edf2fb] md:py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[#9fb0cc]">
        <p>
          Přihlášen: <strong className="text-[#d8e2f3]">{access.displayName ?? access.email}</strong>
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/studio" className="underline hover:text-[#ff6a00]">
            Studio
          </Link>
          <Link href="/admin/sources" className="underline hover:text-[#ff6a00]">
            Health report
          </Link>
          <Link href="/kanaly" className="underline hover:text-[#ff6a00]">
            Veřejné kanály
          </Link>
        </div>
      </div>

      <SourcesAdminBoard />
    </main>
  );
}
