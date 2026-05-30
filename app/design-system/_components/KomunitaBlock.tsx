"use client";

import { useState } from "react";
import { SendMark } from "./icons";

type ChatMessage = { id: number; name: string; text: string; mine?: boolean };

let nextId = 0;
const SEED: ChatMessage[] = [
  { id: nextId++, name: "Markéta H.", text: "Konečně někdo, kdo to řekne nahlas." },
  { id: nextId++, name: "Tomáš", text: "Sledujeme od první minuty 🙌" },
  { id: nextId++, name: "Jana P.", text: "Pošlete prosím odkaz na ten rozhovor." },
];

type KomunitaBlockProps = { variant?: "full" | "compact" };

// Orange community rail with the live chat — the colour anchor of the page.
// `compact` drops the message list for the hero overlay CTA.
export function KomunitaBlock({ variant = "full" }: KomunitaBlockProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(SEED);
  const [draft, setDraft] = useState("");

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { id: nextId++, name: "Vy", text, mine: true }]);
    setDraft("");
  };

  const compact = variant === "compact";

  return (
    <div className={`vx-on-dark flex h-full flex-col bg-verox-orange text-white ${compact ? "" : "min-h-[320px]"}`}>
      <div className="flex items-center justify-between gap-2 px-5 pt-4">
        <span className="vx-display text-[1.4rem] leading-none">Komunita</span>
        <span style={{ fontFamily: "var(--vx-mono)", fontSize: "0.6rem", letterSpacing: "0.16em" }}>
          412 online
        </span>
      </div>
      <p className="px-5 pt-2 text-[0.7rem] uppercase tracking-[0.2em] text-white" style={{ fontFamily: "var(--vx-mono)" }}>
        Zde napište zprávu
      </p>

      {!compact ? (
        <div className="mt-3 flex-1 space-y-2 overflow-hidden px-5">
          {messages.slice(-5).map((m) => (
            <div
              key={m.id}
              className={`max-w-[88%] px-3 py-2 text-sm leading-snug ${
                m.mine ? "ml-auto bg-white text-verox-ink" : "bg-black/20 text-white"
              }`}
            >
              <span className="block text-[0.62rem] uppercase tracking-[0.12em] opacity-80" style={{ fontFamily: "var(--vx-mono)" }}>
                {m.name}
              </span>
              {m.text}
            </div>
          ))}
        </div>
      ) : null}

      <form
        className={`flex items-center gap-2 bg-white p-1.5 ${compact ? "m-3 mt-3" : "m-4"}`}
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Napište zprávu…"
          className="min-w-0 flex-1 bg-transparent px-2 text-sm text-verox-ink outline-none placeholder:text-verox-gray"
          aria-label="Napsat zprávu do komunity"
        />
        <button
          type="submit"
          className="grid h-9 w-9 shrink-0 place-items-center bg-verox-orangeDeep text-white transition-colors hover:bg-verox-orangeText"
          aria-label="Odeslat"
        >
          <SendMark />
        </button>
      </form>
    </div>
  );
}
