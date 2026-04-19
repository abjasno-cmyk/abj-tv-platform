"use client";

import { useEffect, useState } from "react";

type DebugEvent = {
  video_id?: string;
  event_type?: "expand" | "play" | "skip";
  at?: string;
};

const STORAGE_KEY = "abj.editorial.event.debug.recent";

function readEvents(): DebugEvent[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item === "object") as DebugEvent[];
  } catch {
    return [];
  }
}

export function EditorialEventDebugPanel() {
  const [events, setEvents] = useState<DebugEvent[]>(() => readEvents());

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      setEvents(readEvents());
    };

    const onCustom = () => setEvents(readEvents());
    window.addEventListener("storage", onStorage);
    window.addEventListener("abj:editorial-event", onCustom as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("abj:editorial-event", onCustom as EventListener);
    };
  }, []);

  if (process.env.NODE_ENV !== "development") return null;

  return (
    <aside className="fixed bottom-3 left-3 z-[90] max-h-[38vh] w-[320px] overflow-auto rounded border border-[rgba(198,168,91,0.3)] bg-[rgba(3,8,14,0.92)] p-2 text-[11px]">
      <p className="mb-1 font-semibold text-abj-gold">Editorial debug</p>
      {events.length === 0 ? (
        <p className="text-abj-text2">No events yet</p>
      ) : (
        <ul className="space-y-1">
          {events.map((event, index) => (
            <li key={`${event.video_id ?? "unknown"}-${event.event_type ?? "event"}-${index}`} className="text-abj-text2">
              <span className="text-abj-text1">{event.event_type ?? "?"}</span>{" "}
              <span className="font-mono">{event.video_id ?? "unknown"}</span>{" "}
              <span>{event.at ? new Date(event.at).toLocaleTimeString("cs-CZ") : ""}</span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
