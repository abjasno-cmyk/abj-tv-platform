import Link from "next/link";

import { VideoSeoTranscriptExpand } from "@/components/seo/VideoSeoTranscriptExpand";
import { YouTubeEmbed } from "@/components/seo/YouTubeEmbed";
import { splitTranscriptParagraphs, truncateTranscriptForSsr } from "@/lib/seo/escape";
import { channelSeoPath } from "@/lib/seo/channelSlug";
import { videoSeoPath } from "@/lib/seo/slug";
import type { RelatedVideoSeo, VideoSeoRecord } from "@/lib/seo/videoPageData";
import { videoSharePath } from "@/lib/viewer/videoMetadata";

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

type VideoSeoPageContentProps = {
  video: VideoSeoRecord;
  relatedVideos: RelatedVideoSeo[];
  transcriptText: string | null;
  channelSlug?: string | null;
};

export function VideoSeoPageContent({ video, relatedVideos, transcriptText, channelSlug }: VideoSeoPageContentProps) {
  const channelHref = channelSlug ? channelSeoPath(channelSlug) : "/kanaly";
  const channelLabel = video.channelName || "Kanály";
  const transcript = transcriptText?.trim() ?? "";
  const transcriptParts = transcript
    ? truncateTranscriptForSsr(transcript)
    : { visibleText: "", truncated: false, totalChars: 0 };
  const transcriptParagraphs = transcriptParts.visibleText
    ? splitTranscriptParagraphs(transcriptParts.visibleText)
    : [];

  return (
    <div className="vx-live vx-sub seo-video-page">
      <nav className="seo-breadcrumbs" aria-label="Drobečková navigace">
        <Link href="/">Verox</Link>
        <span aria-hidden="true"> / </span>
        <Link href={channelHref}>{channelLabel}</Link>
        <span aria-hidden="true"> / </span>
        <span>{video.title}</span>
      </nav>

      <article className="seo-video-article">
        <header className="seo-video-header">
          <h1>{video.title}</h1>
          <p className="seo-video-meta">
            {video.channelName ? <span>{video.channelName}</span> : null}
            {video.channelName ? <span aria-hidden="true"> · </span> : null}
            <time dateTime={video.publishedAt ?? undefined}>{formatPublishedLabel(video.publishedAt)}</time>
          </p>
          {video.topics.length > 0 ? (
            <ul className="seo-video-topics" aria-label="Témata">
              {video.topics.map((topic) => (
                <li key={topic}>{topic}</li>
              ))}
            </ul>
          ) : null}
        </header>

        <YouTubeEmbed videoId={video.videoId} title={video.title} />

        <div className="seo-video-actions">
          <Link href={video.playerPath} className="seo-video-play-link">
            Přehrát v přehrávači Verox
          </Link>
          <a href={video.youtubeUrl} className="seo-video-source-link" rel="noopener noreferrer" target="_blank">
            Původní zdroj na YouTube
          </a>
        </div>

        {video.description ? <p className="seo-video-description">{video.description}</p> : null}

        {transcriptParagraphs.length > 0 ? (
          <section className="seo-transcript" aria-labelledby="seo-transcript-title">
            <h2 id="seo-transcript-title">Přepis videa</h2>
            <details className="seo-transcript-details" open>
              <summary>Zobrazit / skrýt přepis</summary>
              <div className="seo-transcript-body">
                {transcriptParagraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </details>
            {transcriptParts.truncated ? (
              <>
                <p className="seo-transcript-note">
                  Zobrazena první část přepisu ({transcriptParts.visibleText.length.toLocaleString("cs-CZ")} z{" "}
                  {transcriptParts.totalChars.toLocaleString("cs-CZ")} znaků).
                </p>
                <VideoSeoTranscriptExpand videoId={video.videoId} />
              </>
            ) : null}
          </section>
        ) : null}

        {relatedVideos.length > 0 ? (
          <section className="seo-related" aria-labelledby="seo-related-title">
            <h2 id="seo-related-title">Další videa kanálu {video.channelName}</h2>
            <ul className="seo-related-list">
              {relatedVideos.map((item) => {
                const href = item.slug ? videoSeoPath(item.slug) : videoSharePath(item.videoId);
                return (
                  <li key={item.videoId}>
                    <Link href={href} className="seo-related-card">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.thumbnailUrl} alt="" loading="lazy" />
                      <span className="seo-related-copy">
                        <span className="seo-related-title">{item.title}</span>
                        <span className="seo-related-date">{formatPublishedLabel(item.publishedAt)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </article>
    </div>
  );
}
