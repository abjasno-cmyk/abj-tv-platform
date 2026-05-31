"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { VeroxCarouselChevron } from "@/components/abj/VeroxCarouselChevron";
import type { ProgramItem } from "@/lib/epg-types";

type LiveProgramCarouselProps = {
  items: ProgramItem[];
  currentSlotKey: string | null;
  onSelect: (item: ProgramItem) => void;
  itemKey: (item: ProgramItem, idx: number) => string;
  resolveThumbnail: (item: ProgramItem) => string;
};

export function LiveProgramCarousel({ items, currentSlotKey, onSelect, itemKey, resolveThumbnail }: LiveProgramCarouselProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeDotIndex, setActiveDotIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const updateDotIndex = useCallback(() => {
    const container = scrollRef.current;
    if (!container || items.length === 0 || container.clientWidth <= 0) return;
    const itemWidth = container.scrollWidth / items.length;
    const index = itemWidth > 0 ? Math.round(container.scrollLeft / itemWidth) : 0;
    setActiveDotIndex(Math.max(0, Math.min(items.length - 1, index)));
  }, [items.length]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const onScroll = () => updateDotIndex();
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [updateDotIndex]);

  const scrollBy = (direction: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;
    const maxLeft = Math.max(0, container.scrollWidth - container.clientWidth);
    if (maxLeft <= 6) return;
    const step = Math.max(220, Math.round(container.clientWidth * 0.72));
    const currentLeft = container.scrollLeft;
    if (direction === "right") {
      const nextLeft = currentLeft + step;
      container.scrollTo({ left: nextLeft >= maxLeft - 2 ? 0 : Math.min(maxLeft, nextLeft), behavior: "smooth" });
      return;
    }
    const nextLeft = currentLeft - step;
    container.scrollTo({ left: currentLeft <= 2 ? maxLeft : Math.max(0, nextLeft), behavior: "smooth" });
  };

  return (
    <section className="verox-live-mobile-only verox-live-program-section py-4">
      <h3 className="verox-live-program-title verox-font-myriad-regular mb-3 text-center uppercase leading-normal text-[#F37021]">
        PRÁVĚ HRAJE
      </h3>

      <div className="verox-live-carousel-wrap px-1">
        <button
          type="button"
          onClick={() => scrollBy("left")}
          disabled={items.length === 0}
          className="verox-carousel-chevron-btn verox-carousel-chevron-btn--left disabled:opacity-35"
          aria-label="Posunout program doleva"
        >
          <VeroxCarouselChevron direction="left" />
        </button>

        <div ref={scrollRef} className="verox-live-carousel-track mx-10">
          <div className="flex min-w-max gap-2">
            {items.length === 0 ? (
              <p className="verox-font-myriad-regular px-2 py-4 text-sm text-[#717171]">Program se připravuje.</p>
            ) : (
              items.map((item, idx) => {
                const key = itemKey(item, idx);
                const active = selectedKey === key || currentSlotKey === key;
                const isCurrentTime = currentSlotKey === key;
                return (
                  <button
                    key={`mobile-${key}`}
                    type="button"
                    onClick={() => {
                      setSelectedKey(key);
                      setActiveDotIndex(idx);
                      onSelect(item);
                    }}
                    className={`w-[56vw] max-w-[220px] shrink-0 snap-center snap-always text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F37021]/45 ${
                      active || isCurrentTime ? "scale-[1.02] opacity-100" : "scale-[0.96] opacity-55"
                    }`}
                  >
                    <div className="relative aspect-[16/9] w-full bg-black">
                      <img src={resolveThumbnail(item)} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
                      {isCurrentTime ? <div className="pointer-events-none absolute inset-0 bg-[#F37021]/35" /> : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => scrollBy("right")}
          disabled={items.length === 0}
          className="verox-carousel-chevron-btn verox-carousel-chevron-btn--right disabled:opacity-35"
          aria-label="Posunout program doprava"
        >
          <VeroxCarouselChevron direction="right" />
        </button>
      </div>

      {items.length > 0 ? (
        <div className="mt-3 flex items-center justify-center gap-2">
          {items.map((item, idx) => {
            const key = itemKey(item, idx);
            const active = activeDotIndex === idx || currentSlotKey === key;
            return <span key={`dot-${key}`} aria-hidden="true" className={`h-2 w-2 rounded-full ${active ? "bg-[#F37021]" : "bg-[#717171]"}`} />;
          })}
        </div>
      ) : null}
    </section>
  );
}
