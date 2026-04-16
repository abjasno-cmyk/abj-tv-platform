"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/live", label: "Živě", icon: "▶" },
  { href: "/feed", label: "Program", icon: "◧" },
  { href: "/conversations", label: "Hospoda", icon: "◉" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 bg-[var(--bg)]/70 px-4 pb-4 pt-2 backdrop-blur-md">
      <ul className="mx-auto flex max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-2 shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <li key={tab.href} className="flex-1 py-2">
              <Link
                href={tab.href}
                className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-medium uppercase tracking-[0.14em] transition-all duration-200 ease-out ${
                  isActive
                    ? "bg-[var(--abj-glow)] text-[var(--text-main)] shadow-[0_0_0_1px_rgba(59,130,246,0.35),0_4px_20px_rgba(59,130,246,0.12)]"
                    : "text-[var(--text-soft)] hover:scale-[1.02] hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--text-main)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
                }`}
              >
                <span className="text-sm leading-none">{tab.icon}</span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
