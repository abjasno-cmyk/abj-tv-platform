"use client";

const PRESENCE_SESSION_KEY = "verox_presence_session_v1";

export function getOrCreatePresenceSessionId(): string {
  if (typeof window === "undefined") return "server";
  try {
    const existing = window.localStorage.getItem(PRESENCE_SESSION_KEY);
    if (existing && /^[a-zA-Z0-9_-]{8,120}$/.test(existing)) {
      return existing;
    }
    const generated =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `ps-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    window.localStorage.setItem(PRESENCE_SESSION_KEY, generated);
    return generated;
  } catch {
    return `ps-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }
}
