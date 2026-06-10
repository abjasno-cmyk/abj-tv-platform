import type { Metadata } from "next";
import Link from "next/link";

import { LiveCommentsBoard } from "@/components/studio/LiveCommentsBoard";
import { StudioLiveCommentsLogin } from "@/components/studio/StudioLiveCommentsLogin";
import { hasStudioCapability, resolveStudioAccessContext } from "@/lib/studio/access";
import { resolveLiveCommentsVideoContext } from "@/lib/studio/liveComments";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live komentáře • VEROX Studio",
  robots: {
    index: false,
    follow: false,
  },
};

type LiveKomentarePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
};

function readParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default async function LiveKomentarePage({ searchParams }: LiveKomentarePageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const requestedVideoId = readParam(resolvedSearchParams.videoId);
  const access = await resolveStudioAccessContext();
  const videoContext = await resolveLiveCommentsVideoContext(requestedVideoId);

  if (!access.user) {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-10 text-[#edf2fb]">
        <section className="rounded-2xl border border-[#2f3647] bg-[#0f131b] p-6 shadow-[0_20px_45px_rgba(0,0,0,0.35)]">
          <p className="text-xs uppercase tracking-[0.18em] text-[#ff6a00]">VEROX Studio</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Moderátorská nástěnka komentářů</h1>
          <p className="mt-3 text-sm text-[#b7c1d3]">
            Tato stránka je určená pro moderaci živých streamů ABJ. Přihlaste se prosím přes Google účet{" "}
            <strong>abjasno@gmail.com</strong>.
          </p>
          <StudioLiveCommentsLogin />
          <p className="mt-4 text-xs text-[#8fa0bb]">
            Po přihlášení se stránka automaticky odemkne. Odkaz si můžete uložit do záložek:{" "}
            <code>/studio/live-komentare</code>
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
            Přihlášený účet ({access.email ?? "neznámý"}) nemá oprávnění k moderátorské nástěnce. Použijte Google účet{" "}
            <strong>abjasno@gmail.com</strong>.
          </p>
          <Link href="/live" className="mt-4 inline-flex text-xs text-[#ffd0ad] underline">
            Zpět na VEROX
          </Link>
        </section>
      </main>
    );
  }

  if (!hasStudioCapability(access, "comments_moderate")) {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-10 text-[#edf2fb]">
        <section className="rounded-2xl border border-[#7a3d2b] bg-[#2a1814] p-6">
          <h1 className="text-xl font-semibold text-white">Nedostatečná role</h1>
          <p className="mt-3 text-sm text-[#ffcebd]">Váš účet nemá oprávnění moderovat komentáře.</p>
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
          <Link href="/live" className="underline hover:text-[#ff6a00]">
            Živé vysílání
          </Link>
        </div>
      </div>

      <LiveCommentsBoard
        initialVideoId={videoContext?.videoId ?? requestedVideoId}
        initialVideoTitle={videoContext?.title ?? null}
      />
    </main>
  );
}
