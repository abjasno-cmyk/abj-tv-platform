// ProudX katalog videí — dark editorial grid, sladěný s živou stránkou.

import { ProudXHeader } from "@/components/proudx/ProudXHeader";
import { videoSharePath } from "@/lib/viewer/videoMetadata";
import type { FeedVideo } from "@/lib/dayOverview";

import "@/app/live/proudx-live.css";

const FRESHNESS_LABEL: Record<FeedVideo["freshness"], string> = {
  breaking: "Právě teď",
  today: "Dnes",
  week: "Tento týden",
  evergreen: "Z archivu",
};

function thumbFor(v: FeedVideo): string {
  if (v.thumbnail && v.thumbnail.trim()) return v.thumbnail.trim();
  return `https://img.youtube.com/vi/${v.video_id}/hqdefault.jpg`;
}

function durationLabel(min?: number | null): string | null {
  if (!min || min <= 0) return null;
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

export default function ProudXVidea({ videos }: { videos: FeedVideo[] }) {
  return (
    <div className="px">
      <div className="px-bgglow" aria-hidden="true" />
      <ProudXHeader active="videa" />

      <main className="px-main">
        <div className="pxv-hero">
          <span className="px-eyebrow">Katalog</span>
          <h1 className="pxv-h1">Nejnovější videa</h1>
          <p className="pxv-lede">Výběr z nepřetržitého proudu — kdykoli k přehrání.</p>
        </div>

        {videos.length === 0 ? (
          <p className="pxv-empty">Videa se právě připravují.</p>
        ) : (
          <div className="pxv-grid">
            {videos.map((v) => {
              const dur = durationLabel(v.duration_min);
              return (
                <a key={v.video_id} className="pxv-card" href={videoSharePath(v.video_id)}>
                  <span className="pxv-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumbFor(v)} alt="" loading="lazy" />
                    <span className="pxv-fresh">{FRESHNESS_LABEL[v.freshness]}</span>
                    {dur ? <span className="pxv-dur">{dur}</span> : null}
                    <span className="pxv-play" aria-hidden="true">
                      <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </span>
                  </span>
                  <span className="pxv-meta">
                    <span className="pxv-ch">{v.channel}</span>
                    <span className="pxv-title">{v.title}</span>
                  </span>
                </a>
              );
            })}
          </div>
        )}
      </main>

      <footer className="px-foot">
        <span className="px-foot-brand">Proud<span>X</span></span>
        <span className="px-foot-tag">Zůstaňte v proudu</span>
      </footer>
    </div>
  );
}
