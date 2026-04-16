"use client";

import { useMemo, useState } from "react";

type ChatMessage = {
  id: string;
  name: string;
  text: string;
  timestamp: string;
  kind: "regular" | "visitor" | "inactive" | "system" | "self";
};

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "m1",
    name: "ABJ Moderátor",
    text: "Vítejte v hospodě. Diskuse k vysílání je otevřená.",
    timestamp: "20:02",
    kind: "regular",
  },
  {
    id: "m2",
    name: "Host",
    text: "Dnes je silné téma, díky za výběr hostů.",
    timestamp: "20:05",
    kind: "visitor",
  },
  {
    id: "m3",
    name: "Systém ABJ",
    text: "Prosíme o věcnou a slušnou debatu.",
    timestamp: "20:07",
    kind: "system",
  },
];

function currentPragueTime(): string {
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function messageNameColor(kind: ChatMessage["kind"]): string {
  if (kind === "regular" || kind === "self") return "text-abj-gold";
  if (kind === "visitor") return "text-[#4E7E9E]";
  if (kind === "inactive") return "text-[#3E5060]";
  return "text-abj-text2";
}

export function Hospoda() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const online = 142;

  const trimmedMessages = useMemo(() => messages.slice(-7), [messages]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;
    const next: ChatMessage = {
      id: `self-${Date.now()}`,
      name: "Vy",
      text,
      timestamp: currentPragueTime(),
      kind: "self",
    };
    setMessages((prev) => [...prev, next].slice(-12));
    setInput("");
  };

  return (
    <aside className="flex h-full w-[252px] shrink-0 flex-col overflow-hidden border-l border-abj-goldDim bg-abj-hospoda">
      <header className="border-b border-abj-goldDim px-[15px] pb-[10px] pt-[13px]">
        <div className="flex items-center justify-between">
          <p className="font-[var(--font-sans)] text-[9px] uppercase tracking-[0.20em] text-abj-gold">
            Hospoda
          </p>
          <p className="flex items-center gap-1.5 font-[var(--font-sans)] text-[10px] text-abj-text2">
            <span className="h-[5px] w-[5px] rounded-full bg-[#3A6E47]" />
            {online} online
          </p>
        </div>
        <p className="mt-1 font-[var(--font-sans)] text-[11px] italic text-[rgba(154,163,178,0.45)]">
          živá diskuse k vysílání
        </p>
      </header>

      <div className="flex-1 overflow-hidden px-[14px] pb-2 pt-[13px]">
        <div className="flex flex-col gap-3">
          {trimmedMessages.map((message) => (
            <article
              key={message.id}
              className="flex animate-[msgAppear_0.25s_ease] flex-col gap-[3px]"
            >
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`font-[var(--font-sans)] text-[11px] font-medium ${messageNameColor(
                    message.kind
                  )}`}
                >
                  {message.name}
                </span>
                <span className="font-[var(--font-sans)] text-[9px] text-abj-text3">
                  {message.timestamp}
                </span>
              </div>
              <p
                className={`font-[var(--font-sans)] text-[12px] leading-[1.5] ${
                  message.kind === "system"
                    ? "text-[11px] italic text-[rgba(154,163,178,0.42)]"
                    : "text-[#8A94A2]"
                }`}
              >
                {message.text}
              </p>
            </article>
          ))}
        </div>
      </div>

      <footer className="border-t border-abj-goldDim px-3 py-[9px]">
        <div className="flex items-center gap-2 rounded-[5px] border border-[rgba(198,168,91,0.17)] bg-[rgba(14,39,69,0.5)] px-[11px] py-[7px]">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                sendMessage();
              }
            }}
            type="text"
            placeholder="Napiš zprávu..."
            className="h-[24px] flex-1 border-none bg-transparent font-[var(--font-sans)] text-[12px] text-abj-text1 outline-none placeholder:text-[rgba(154,163,178,0.30)]"
          />
          <button
            type="button"
            onClick={sendMessage}
            className="border-none bg-transparent font-[var(--font-sans)] text-[14px] text-abj-gold opacity-60 transition-opacity duration-150 hover:opacity-100"
          >
            ➤
          </button>
        </div>
      </footer>
    </aside>
  );
}
