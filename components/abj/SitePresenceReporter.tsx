"use client";

import { useEffect } from "react";

import { getOrCreatePresenceSessionId } from "@/lib/live/presenceSession";

const HEARTBEAT_MS = 20_000;

function sendHeartbeat() {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    return;
  }
  const sessionId = getOrCreatePresenceSessionId();
  const pagePath =
    typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/";
  void fetch("/api/live/presence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, page_path: pagePath }),
    keepalive: true,
  }).catch(() => {
    // Presence must never break UX.
  });
}

/** Registers this browser tab as an active site visitor (all pages). */
export function SitePresenceReporter() {
  useEffect(() => {
    sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, HEARTBEAT_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
