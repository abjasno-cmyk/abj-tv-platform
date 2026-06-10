"use client";

import { useCallback } from "react";

import { useAuth } from "@/components/auth/AuthProvider";

export function StudioLiveCommentsLogin() {
  const { openLoginModal } = useAuth();

  const triggerLogin = useCallback(() => {
    openLoginModal({
      reason: "Moderátorská nástěnka komentářů je dostupná po přihlášení přes Google (abjasno@gmail.com).",
    });
  }, [openLoginModal]);

  return (
    <button
      type="button"
      onClick={triggerLogin}
      className="mt-5 inline-flex rounded-md border border-[#ff6a00] bg-[#ff6a00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e95f00]"
    >
      Přihlásit se přes Google
    </button>
  );
}
