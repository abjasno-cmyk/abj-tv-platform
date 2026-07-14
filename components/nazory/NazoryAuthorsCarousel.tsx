"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { getDictionary } from "@/lib/i18n/dictionary";
import { useLocale } from "@/lib/i18n/useLocale";
import type { PublicAuthorCatalogItem } from "@/lib/nazory/authors";

const DOT_COUNT = 7;

type NazoryAuthorsCarouselProps = {
  authors: PublicAuthorCatalogItem[];
  activeSlug?: string | null;
};

export function NazoryAuthorsCarousel({ authors, activeSlug = null }: NazoryAuthorsCarouselProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dot, setDot] = useState(0);
  const dictionary = getDictionary(useLocale());

  const scrollAuthors = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  useEffect(() => {
    const trackEl = trackRef.current;
    const dotFor = (el: HTMLDivElement | null): number => {
      if (!el) return 0;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 1) return 0;
      const progress = Math.min(1, Math.max(0, el.scrollLeft / max));
      return Math.round(progress * (DOT_COUNT - 1));
    };
    const onTrackScroll = () => setDot(dotFor(trackEl));
    onTrackScroll();
    trackEl?.addEventListener("scroll", onTrackScroll, { passive: true });
    window.addEventListener("resize", onTrackScroll);
    return () => {
      trackEl?.removeEventListener("scroll", onTrackScroll);
      window.removeEventListener("resize", onTrackScroll);
    };
  }, [authors.length]);

  useEffect(() => {
    if (!activeSlug || !trackRef.current) return;
    const activeEl = trackRef.current.querySelector<HTMLElement>(".channel-card-active");
    if (!activeEl) return;
    activeEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeSlug, authors.length]);

  return (
    <section className="channels nazory-authors" aria-labelledby="hf-authors">
      <h2 id="hf-authors">{dictionary.opinions.authorsTitle}</h2>
      <p>{dictionary.opinions.authorsHint}</p>
      <div className="stage-wrap">
        <button
          type="button"
          className="stage-nav stage-prev"
          onClick={() => scrollAuthors(-1)}
          aria-label={dictionary.opinions.previousAuthors}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M15 5l-7 7 7 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="channel-track" ref={trackRef} aria-label={dictionary.opinions.authorsAria}>
          {authors.length === 0 ? (
            <article className="channel-card">
              <span className="ch-name">{dictionary.opinions.preparingAuthors}</span>
            </article>
          ) : (
            authors.map((author) => {
              const active = author.slug === activeSlug;
              const meta = [author.title, author.profession, author.city].filter(Boolean).join(" · ");
              const bio = author.bio?.trim() ?? "";
              return (
                <Link
                  key={author.slug}
                  href={`/nazory/autor/${author.slug}`}
                  className={`channel-card${active ? " channel-card-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  {author.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="ch-avatar" src={author.avatarUrl} alt="" />
                  ) : null}
                  <span className="ch-name">{author.displayName}</span>
                  {meta ? <span className="ch-author-meta">{meta}</span> : null}
                  {bio ? <span className="ch-author-bio">{bio}</span> : null}
                </Link>
              );
            })
          )}
        </div>
        <button
          type="button"
          className="stage-nav stage-next"
          onClick={() => scrollAuthors(1)}
          aria-label={dictionary.opinions.nextAuthors}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M9 5l7 7-7 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <div className="dots" aria-hidden="true">
        {Array.from({ length: DOT_COUNT }).map((_, i) => (
          <span key={i} className={i === dot ? "active" : undefined} />
        ))}
      </div>
    </section>
  );
}
