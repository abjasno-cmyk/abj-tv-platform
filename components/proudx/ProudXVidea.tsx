// ProudX katalog videí — dark editorial grid, sladěný s živou stránkou.

import { ProudXHeader } from "@/components/proudx/ProudXHeader";
import { ProudXFooter } from "@/components/proudx/ProudXFooter";
import { videoSharePath } from "@/lib/viewer/videoMetadata";
import { tenantChannelLabel } from "@/lib/tenant";
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

const CZ_DATE = new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });

function premiereDateLabel(publishedAt: string | undefined): string | null {
  if (!publishedAt) return null;
  const date = new Date(publishedAt);
  if (!Number.isFinite(date.getTime()) || date.getFullYear() < 2000) return null;
  return CZ_DATE.format(date);
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
                    <span className="pxv-ch">{tenantChannelLabel(v.channel)}</span>
                    <span className="pxv-title">{v.title}</span>
                    {premiereDateLabel(v.published_at) ? (
                      <span className="px-card-date">Premiéra {premiereDateLabel(v.published_at)}</span>
                    ) : null}
                  </span>
                </a>
              );
            })}
          </div>
        )}
      </main>

      <ProudXFooter />
    </div>
  );
}
