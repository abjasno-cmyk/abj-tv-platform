"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "verox_beta_banner_dismissed_v1";

function resolveFeedbackHref(): string {
  const configured = process.env.NEXT_PUBLIC_FEEDBACK_URL?.trim();
  if (configured) return configured;
  return "mailto:info@verox.cz?subject=VEROX%20beta%20feedback";
}

export function BetaBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Ignore storage errors — banner just reappears next load.
    }
    setDismissed(true);
  };

  return (
    <div className="bg-[#303030] px-4 py-2 text-[12px] leading-snug text-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-center gap-3 text-center">
        <p className="m-0">
          <span className="font-semibold text-[#F37021]">BETA:</span> Obsah je generován s pomocí
          umělé inteligence a prochází redakční kontrolou. Uvítáme váš{" "}
          <a href={resolveFeedbackHref()} className="underline hover:text-[#F37021]">
            zpětnou vazbu
          </a>
          .
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Zavřít upozornění"
          className="shrink-0 rounded px-1 text-white/70 transition hover:text-white"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
