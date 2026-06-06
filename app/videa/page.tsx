import { Fragment } from "react";
import Link from "next/link";

import { loadVideaPageVideos, type FeedVideo } from "@/lib/dayOverview";
import { resolveVideaCardSummary } from "@/lib/videoDescriptionSummary";

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

async function loadVideos(): Promise<FeedVideo[]> {
  try {
    return await loadVideaPageVideos();
  } catch {
    return [];
  }
}

// VIDEA podle klientské šablony: karta = datum (měsíc + velký den) + náhled + popis.
export default async function VideaPage() {
  const videos = await loadVideos();

  return (
    <div className="vx-live vx-sub">
      <h1 className="section-h">VIDEA</h1>
      {videos.length === 0 ? (
        <div className="mv">
          <div className="info">Za posledních 7 dní zatím nejsou k dispozici žádná videa.</div>
        </div>
      ) : (
        videos.map((video, i) => {
          const { month, day } = dateParts(video.published_at);
          const desc = resolveVideaCardSummary(video);
          const href = `/live?videoId=${encodeURIComponent(video.video_id)}`;
          return (
            <Fragment key={video.video_id}>
              <article className="vx-card">
                <div className="date">
                  <div className="month">{month}</div>
                  <div className="day">{day}</div>
                </div>
                <Link href={href} className="thumb" aria-label={video.title}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={video.thumbnail || "/placeholder-thumb.jpg"} alt={video.title} loading="lazy" />
                </Link>
                <div className="body">
                  <h3>{video.title}</h3>
                  <div className="by">{video.channel}</div>
                  {desc ? <p>{desc}</p> : null}
                  <Link href={href} className="vx-arrow">
                    <b>Zjistit více</b>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/ikona_sipka.svg" alt="" />
                  </Link>
                </div>
              </article>
              {i < videos.length - 1 ? (
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
