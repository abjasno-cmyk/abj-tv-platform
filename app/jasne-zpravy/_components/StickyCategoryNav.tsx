"use client";

import { useEffect, useMemo, useState } from "react";

type CategoryNavItem = {
  anchorId: string;
  label: string;
};

type StickyCategoryNavProps = {
  items: CategoryNavItem[];
};

const OBSERVER_THRESHOLDS = [0, 0.1, 0.25, 0.5, 0.75];

function pickClosestToOffset(sectionIds: Set<string>, allSections: HTMLElement[]): string | null {
  let next: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const section of allSections) {
    if (!sectionIds.has(section.id)) continue;
    const distance = Math.abs(section.getBoundingClientRect().top - 140);
    if (distance < bestDistance) {
      bestDistance = distance;
      next = section.id;
    }
  }
  return next;
}

export function StickyCategoryNav({ items }: StickyCategoryNavProps) {
  const [activeAnchorId, setActiveAnchorId] = useState<string | null>(items[0]?.anchorId ?? null);
  const anchorIds = useMemo(() => items.map((item) => item.anchorId), [items]);

  useEffect(() => {
    if (anchorIds.length === 0) return;

    const sections = anchorIds
      .map((anchorId) => document.getElementById(anchorId))
      .filter((section): section is HTMLElement => section instanceof HTMLElement);
    if (sections.length === 0) return;

    const visibleSections = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const sectionId = (entry.target as HTMLElement).id;
          if (entry.isIntersecting) {
            visibleSections.add(sectionId);
          } else {
            visibleSections.delete(sectionId);
          }
        }

        const closestVisible = pickClosestToOffset(visibleSections, sections);
        if (closestVisible) {
          setActiveAnchorId(closestVisible);
        }
      },
      {
        rootMargin: "-120px 0px -55% 0px",
        threshold: OBSERVER_THRESHOLDS,
      },
    );

    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [anchorIds]);

  return (
    <nav className="sticky top-20 z-20 mb-6 rounded-2xl border border-gray-200/90 bg-white/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">Výběr kategorií</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <a
          href="#vydani-top"
          className="rounded-full border border-[#FF6A00]/25 bg-[#FF6A00]/10 px-3 py-1.5 text-xs font-semibold text-[#B04A00] hover:bg-[#FF6A00]/15"
        >
          ↑ Nahoru
        </a>
        {items.map((item) => {
          const isActive = item.anchorId === activeAnchorId;
          return (
            <a
              key={item.anchorId}
              href={`#${item.anchorId}`}
              aria-current={isActive ? "true" : undefined}
              onClick={() => setActiveAnchorId(item.anchorId)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                isActive
                  ? "border-[#FF6A00]/30 bg-[#FF6A00]/10 text-[#B04A00]"
                  : "border-gray-200 bg-white text-gray-700 hover:border-[#FF6A00]/35 hover:text-[#B04A00]"
              }`}
            >
              {item.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
