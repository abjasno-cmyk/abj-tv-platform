"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { MyVeroxSettings } from "@/components/auth/MyVeroxSettings";

export function MyVeroxAccountSettings() {
  const { isAuthenticated, profile } = useAuth();
  const [newsletterGranted, setNewsletterGranted] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setReady(false);
      return;
    }

    let cancelled = false;
    void fetch("/api/viewer/consents", { credentials: "include", cache: "no-store" })
      .then((response) => response.json().catch(() => ({})))
      .then((payload: { consents?: Record<string, { granted?: boolean }> }) => {
        if (cancelled) return;
        setNewsletterGranted(payload.consents?.newsletter?.granted === true);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  if (!isAuthenticated || !ready) return null;

  return (
    <div className="mv-account-settings-wrap">
      <MyVeroxSettings
        initialDisplayName={profile?.display_name?.trim() || ""}
        initialNewsletterGranted={newsletterGranted}
      />
    </div>
  );
}
