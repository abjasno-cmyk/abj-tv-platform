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
    <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4">
      <ul className="mx-auto flex max-w-3xl rounded-2xl border border-white/60 bg-white/80 px-2 shadow-lg backdrop-blur-md">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <li key={tab.href} className="flex-1 py-2">
              <Link
                href={tab.href}
                className={`flex h-12 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-medium transition-all duration-200 ease-in-out ${
                  isActive
                    ? "bg-blue-100 text-blue-600 shadow-sm"
                    : "text-gray-500 hover:bg-blue-100/60 hover:text-gray-900"
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
