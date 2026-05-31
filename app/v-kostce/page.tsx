import { Fragment } from "react";
import Link from "next/link";

import { loadStructuredFeedPayload, type FeedVideo } from "@/lib/dayOverview";

export const dynamic = "force-dynamic";

const MONTHS = [
  "LEDEN", "ÚNOR", "BŘEZEN", "DUBEN", "KVĚTEN", "ČERVEN",
  "ČERVENEC", "SRPEN", "ZÁŘÍ", "ŘÍJEN", "LISTOPAD", "PROSINEC",
];

function dateParts(iso: string): { month: string; day: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { month: "", day: "" };
  return { month: MONTHS[d.getMonth()] ?? "", day: String(d.getDate()) };
}

function sourceLabel(video: FeedVideo): string {
  const d = new Date(video.published_at);
  if (Number.isNaN(d.getTime())) return video.channel;
  const stamp = new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
  return `${video.channel}  ${stamp}`;
}

async function loadItems(): Promise<FeedVideo[]> {
  try {
    const payload = await loadStructuredFeedPayload();
    const items = payload.top.length > 0 ? payload.top : Object.values(payload.channels).flat();
    return items.slice(0, 24);
  } catch {
    return [];
  }
}

// V KOSTCE podle klientské šablony: datum (měsíc + velký den) · text · akční tlačítka.
export default async function VKostcePage() {
  const items = await loadItems();

  return (
    <div className="vx-live vx-sub">
      <h1 className="section-h">V KOSTCE</h1>
      {items.length === 0 ? (
        <div className="mv">
          <div className="info">Souhrny se právě připravují.</div>
        </div>
      ) : (
        items.map((item, i) => {
          const { month, day } = dateParts(item.published_at);
          const href = `/live?videoId=${encodeURIComponent(item.video_id)}`;
          const summary = item.tldr ?? item.context ?? item.impact ?? "";
          return (
            <Fragment key={item.video_id}>
              <article className="kostka">
                <div className="date">
                  <div className="month">{month}</div>
                  <div className="day">{day}</div>
                </div>
                <div className="body">
                  <h3>{item.title}</h3>
                  <div className="src">{sourceLabel(item)}</div>
                  {summary ? <p>{summary}</p> : null}
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
                  <Link href={href}>Do komunity</Link>
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
        })
      )}
    </div>
  );
}
