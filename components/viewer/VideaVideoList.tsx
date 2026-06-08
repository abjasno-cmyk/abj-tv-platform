"use client";

import Link from "next/link";
import { Fragment } from "react";

import { SaveVideoButton } from "@/components/auth/SaveVideoButton";
import { ShareVideoButton } from "@/components/viewer/ShareVideoButton";
import { VideoCommentButton } from "@/components/viewer/VideoCommentButton";
import { VideoReleaseDateBadge } from "@/components/viewer/VideoReleaseDateBadge";
import { ViewerVideoBadges } from "@/components/viewer/ViewerVideoBadges";
import type { FeedVideo } from "@/lib/dayOverview";
import { liveVideoHref, resolveVideoThumbnail } from "@/lib/viewer/videoMetadata";
import { resolveVideoReleaseIso } from "@/lib/viewer/videoReleaseDate";
import { useViewerVideoState } from "@/lib/viewer/useViewerVideoState";

const MONTHS = [
  "LEDEN", "ÚNOR", "BŘEZEN", "DUBEN", "KVĚTEN", "ČERVEN",
  "ČERVENEC", "SRPEN", "ZÁŘÍ", "ŘÍJEN", "LISTOPAD", "PROSINEC",
];

function dateParts(iso: string): { month: string; day: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { month: "", day: "" };
  return { month: MONTHS[d.getMonth()] ?? "", day: String(d.getDate()) };
}

type VideaVideoListProps = {
  videos: FeedVideo[];
};

export function VideaVideoList({ videos }: VideaVideoListProps) {
  const { savedVideoIds, watchedVideoIds, setSaved } = useViewerVideoState();

  return (
    <>
      {videos.map((video, i) => {
        const releaseIso = resolveVideoReleaseIso({
          publishedAt: video.published_at,
          scheduledStartAt: video.scheduled_start_at,
          videoType: video.video_type,
        });
        const { month, day } = dateParts(releaseIso ?? video.published_at);
        const desc = video.tldr ?? video.context ?? "";
        const href = liveVideoHref({
          videoId: video.video_id,
          title: video.title,
          channelName: video.channel,
        });
        const thumbnail = resolveVideoThumbnail(video.video_id, video.thumbnail);

        return (
          <Fragment key={video.video_id}>
            <article className="vx-card">
              <div className="date">
                <div className="month">{month}</div>
                <div className="day">{day}</div>
              </div>
              <Link href={href} className="thumb vx-videa-thumb" aria-label={video.title}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbnail} alt={video.title} loading="lazy" />
                <ViewerVideoBadges
                  watched={watchedVideoIds.has(video.video_id)}
                  saved={savedVideoIds.has(video.video_id)}
                />
                <VideoReleaseDateBadge
                  publishedAt={video.published_at}
                  scheduledStartAt={video.scheduled_start_at}
                  videoType={video.video_type}
                />
                <VideoCommentButton videoId={video.video_id} videoTitle={video.title} />
              </Link>
              <div className="body">
                <h3>{video.title}</h3>
                <div className="by">{video.channel}</div>
                {desc ? <p>{desc}</p> : null}
                <div className="vx-videa-actions nazory-detail-actions">
                  <SaveVideoButton
                    videoId={video.video_id}
                    title={video.title}
                    channelName={video.channel}
                    thumbnailUrl={thumbnail}
                    saved={savedVideoIds.has(video.video_id)}
                    onSavedChange={(nextSaved) => setSaved(video.video_id, nextSaved)}
                  />
                  <ShareVideoButton videoId={video.video_id} />
                  <VideoCommentButton videoId={video.video_id} videoTitle={video.title} variant="inline" />
                  <Link href={href} className="vx-arrow">
                    <b>Přehrát</b>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/ikona_sipka.svg" alt="" />
                  </Link>
                </div>
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
      })}
    </>
  );
}
