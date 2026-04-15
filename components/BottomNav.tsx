"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/live", label: "Live" },
  { href: "/feed", label: "Feed" },
  { href: "/conversations", label: "Conversations" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur">
      <ul className="mx-auto flex max-w-3xl">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`flex h-14 items-center justify-center text-sm font-medium transition-colors ${
                  isActive ? "text-black" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
