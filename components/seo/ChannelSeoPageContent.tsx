import Link from "next/link";

import { buildChannelIntro } from "@/lib/seo/channelTitles";
import type { ChannelSeoRecord } from "@/lib/seo/channelPageData";
import { videoSeoPath } from "@/lib/seo/slug";

function formatPublishedLabel(iso: string | null): string {
  if (!iso) return "Datum neuvedeno";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Datum neuvedeno";
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

type ChannelSeoPageContentProps = {
  channel: ChannelSeoRecord;
};

export function ChannelSeoPageContent({ channel }: ChannelSeoPageContentProps) {
  const intro = buildChannelIntro(channel.channelName);
  const latestVideo = channel.videos[0] ?? null;

  return (
    <div className="vx-live vx-sub seo-channel-page">
      <nav className="seo-breadcrumbs" aria-label="Drobečková navigace">
        <Link href="/">Verox</Link>
        <span aria-hidden="true"> / </span>
        <Link href="/kanaly">Kanály</Link>
        <span aria-hidden="true"> / </span>
        <span>{channel.channelName}</span>
      </nav>

      <article className="seo-channel-article">
        <header className="seo-channel-header">
          <div className="seo-channel-identity">
            {channel.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={channel.avatarUrl} alt="" className="seo-channel-avatar" loading="lazy" />
            ) : (
              <span className="seo-channel-avatar seo-channel-avatar-fallback" aria-hidden="true">
                {channel.channelName.charAt(0).toUpperCase()}
              </span>
            )}
            <div>
              <h1>{channel.channelName}</h1>
              {channel.latestPublishedAt ? (
                <p className="seo-channel-meta">
                  Nejnovější video:{" "}
                  <time dateTime={channel.latestPublishedAt}>{formatPublishedLabel(channel.latestPublishedAt)}</time>
                </p>
              ) : null}
            </div>
          </div>
          <p className="seo-channel-intro">{intro}</p>
        </header>

        <div className="seo-channel-actions">
          {latestVideo ? (
            <Link href={latestVideo.playerPath} className="seo-channel-play-link">
              Přehrát nejnovější video
            </Link>
          ) : null}
          <Link href="/kanaly" className="seo-channel-list-link">
            Všechny kanály na Verox
          </Link>
          {channel.channelUrl ? (
            <a href={channel.channelUrl} className="seo-channel-source-link" rel="noopener noreferrer" target="_blank">
              Kanál na YouTube
            </a>
          ) : null}
        </div>

        {channel.videos.length > 0 ? (
          <section className="seo-channel-videos" aria-labelledby="seo-channel-videos-title">
            <h2 id="seo-channel-videos-title">Nejnovější videa</h2>
            <ul className="seo-channel-video-list">
              {channel.videos.map((video) => {
                const href = video.slug ? videoSeoPath(video.slug) : video.playerPath;
                return (
                  <li key={video.videoId}>
                    <Link href={href} className="seo-channel-video-card">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={video.thumbnailUrl} alt="" loading="lazy" />
                      <span className="seo-channel-video-copy">
                        <span className="seo-channel-video-title">{video.title}</span>
                        <span className="seo-channel-video-date">{formatPublishedLabel(video.publishedAt)}</span>
                      </span>
                    </Link>
                    <Link href={video.playerPath} className="seo-channel-video-player-link">
                      Přehrát v přehrávači
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : (
          <p className="seo-channel-empty">U tohoto kanálu zatím nejsou dostupná videa v archivu Verox.</p>
        )}

        <p className="seo-channel-footnote">
          Stránka kanálu na Verox.cz. Pro přehrávání s komentáři a přepisem použijte{" "}
          <Link href="/kanaly">sekci Kanály</Link> nebo přímý odkaz do přehrávače u každého videa.
        </p>
      </article>
    </div>
  );
}
