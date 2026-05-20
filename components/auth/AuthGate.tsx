"use client";

import type { ReactNode } from "react";
import { useCallback } from "react";

import { useAuth } from "@/components/auth/AuthProvider";

type AuthGateProps = {
  reason?: string;
  onAuthenticated: () => void;
  children: (params: { trigger: () => void; isAuthenticated: boolean }) => ReactNode;
};

export function AuthGate({ reason, onAuthenticated, children }: AuthGateProps) {
  const { isAuthenticated, openLoginModal } = useAuth();

  const trigger = useCallback(() => {
    if (isAuthenticated) {
      onAuthenticated();
      return;
    }
    openLoginModal({
      reason:
        reason ??
        "Komentujte, lajkujte a pokračujte tam, kde jste skončili. Sledování obsahu zůstává zdarma.",
    });
  }, [isAuthenticated, onAuthenticated, openLoginModal, reason]);

  return children({ trigger, isAuthenticated });
}
