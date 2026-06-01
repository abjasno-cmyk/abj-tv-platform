"use client";

import { Fragment } from "react";
import Link from "next/link";

import { useFeed } from "@/hooks/useFeed";
import type { FeedPost } from "@/lib/api";

// V KOSTCE = editoriální AI shrnutí. Bere stejný zdroj jako původní ABJ X
// (useFeed → /feed): čerstvé posty s headline + what (AI souhrn) + why + impact.
// Renderuje je do karet .kostka (návrh „v_kostce_sirka").

const MONTHS = [
  "LEDEN", "ÚNOR", "BŘEZEN", "DUBEN", "KVĚTEN", "ČERVEN",
  "ČERVENEC", "SRPEN", "ZÁŘÍ", "ŘÍJEN", "LISTOPAD", "PROSINEC",
];

function displayIso(post: FeedPost): string {
  return post.editorial_at ?? post.updated_at ?? post.created_at ?? post.video_published_at ?? "";
}

function dateParts(iso: string): { month: string; day: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { month: "", day: "" };
  return { month: MONTHS[d.getMonth()] ?? "", day: String(d.getDate()) };
}

function sourceLabel(post: FeedPost): string {
  const d = new Date(displayIso(post));
  if (Number.isNaN(d.getTime())) return post.channel_name;
  const stamp = new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
  return `${post.channel_name}  ${stamp}`;
}

export function VKostceList() {
  const { posts, loading } = useFeed();
  const items = posts.slice(0, 30);

  if (items.length === 0) {
    return (
      <div className="mv">
        <div className="info">{loading ? "Načítám souhrny…" : "Souhrny se právě připravují."}</div>
      </div>
    );
  }

  return (
    <>
      {items.map((post, i) => {
        const { month, day } = dateParts(displayIso(post));
        const href = `/live?videoId=${encodeURIComponent(post.video_id)}`;
        const headline = post.headline?.trim();
        const title = headline || post.what?.trim() || "Bez titulku";
        // Pokud headline existuje, ukážeme „what" jako hlavní AI shrnutí níže;
        // jinak je „what" už použité jako titulek (neopakujeme).
        const aiSummary = headline ? post.what?.trim() : null;
        return (
          <Fragment key={post.id}>
            <article className="kostka">
              <div className="date">
                <div className="month">{month}</div>
                <div className="day">{day}</div>
              </div>
              <div className="body">
                <h3>{title}</h3>
                <div className="src">{sourceLabel(post)}</div>
                {aiSummary ? <p>{aiSummary}</p> : null}
                {post.why ? <p>{post.why}</p> : null}
                {post.impact ? <p className="impact">{post.impact}</p> : null}
                <Link href={href} className="vx-arrow">
                  <b>Spustit video</b>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/ikona_sipka.svg" alt="" />
                </Link>
              </div>
              <div className="actions">
                <Link href={href} className="neutral">Reagovat</Link>
                <Link href={href}>Komentáře</Link>
                <Link href={href}>Přihlásit pro sdílení</Link>
                <Link href={href}>Můj Verox</Link>
              </div>
            </article>
            {i < items.length - 1 ? (
              <div className="vx-strip">
                <span />
                <span />
              </div>
            ) : null}
          </Fragment>
        );
      })}
    </>
  );
}
