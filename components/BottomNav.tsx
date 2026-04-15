"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/live", label: "Live", icon: "▶" },
  { href: "/feed", label: "Feed", icon: "◧" },
  { href: "/conversations", label: "Conversations", icon: "◉" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/80 backdrop-blur-xl">
      <ul className="mx-auto flex max-w-3xl px-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <li key={tab.href} className="flex-1 py-2">
              <Link
                href={tab.href}
                className={`flex h-12 flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? "bg-white/10 text-white shadow-lg"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
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
