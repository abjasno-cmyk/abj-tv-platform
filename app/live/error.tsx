"use client";

import { useEffect } from "react";

type LiveErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function LiveError({ error, reset }: LiveErrorProps) {
  useEffect(() => {
    console.error("live-page-error", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-lg font-semibold text-abj-text1">Živé vysílání se nepodařilo načíst</p>
      <p className="text-sm text-abj-text2">
        Přehrávání narazilo na chybu. Obnovte stránku — vysílání by mělo pokračovat.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          className="rounded-full bg-[var(--vx-orange)] px-5 py-2 text-sm font-semibold text-white"
          onClick={() => reset()}
        >
          Obnovit vysílání
        </button>
        <button
          type="button"
          className="rounded-full border border-[var(--abj-gold-dim)] px-5 py-2 text-sm font-semibold text-abj-text1"
          onClick={() => window.location.assign("/live")}
        >
          Načíst znovu
        </button>
      </div>
    </main>
  );
}
