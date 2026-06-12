"use client";

import Link from "next/link";
import { Fragment } from "react";

import type { LiveChannelVideo } from "@/components/abj/ChannelDirectory";
import { SaveVideoButton } from "@/components/auth/SaveVideoButton";
import { ShareVideoButton } from "@/components/viewer/ShareVideoButton";
import { VideoDiscussButton } from "@/components/viewer/VideoDiscussButton";
import { VideoTranscriptLabel } from "@/components/viewer/VideoTranscriptLabel";
import { VideoReleaseDateBadge } from "@/components/viewer/VideoReleaseDateBadge";
import { ViewerVideoBadges } from "@/components/viewer/ViewerVideoBadges";
import { resolveVideoThumbnail } from "@/lib/viewer/videoMetadata";
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

function channelVideoHref(videoId: string, title: string, channelName: string): string {
  const params = new URLSearchParams();
  params.set("title", title);
  params.set("channel", channelName);
  return `/videa/${encodeURIComponent(videoId)}?${params.toString()}`;
}

type KanalyChannelVideosProps = {
  videos: LiveChannelVideo[];
  channelName: string;
};

export function KanalyChannelVideos({ videos, channelName }: KanalyChannelVideosProps) {
  const { savedVideoIds, watchedVideoIds, setSaved } = useViewerVideoState();

  return (
    <>
      {videos.map((video, index) => {
        const { month, day } = dateParts(video.publishedAt);
        const thumbnail = resolveVideoThumbnail(video.videoId, video.thumbnail);
        const href = channelVideoHref(video.videoId, video.title, channelName);

        return (
          <Fragment key={video.videoId}>
            <article className="vx-card vx-card-kanaly">
              <div className="date">
                <div className="month">{month}</div>
                <div className="day">{day}</div>
              </div>
              <Link href={href} className="thumb vx-videa-thumb" aria-label={video.title}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbnail} alt={video.title} loading="lazy" />
                <ViewerVideoBadges
                  watched={watchedVideoIds.has(video.videoId)}
                  saved={savedVideoIds.has(video.videoId)}
                />
                <VideoReleaseDateBadge publishedAt={video.publishedAt} videoType="vod" />
              </Link>
              <div className="body">
                <h3>{video.title}</h3>
                <div className="by">{channelName}</div>
                <div className="vx-videa-actions nazory-detail-actions">
                  <SaveVideoButton
                    videoId={video.videoId}
                    title={video.title}
                    channelName={channelName}
                    thumbnailUrl={thumbnail}
                    saved={savedVideoIds.has(video.videoId)}
                    onSavedChange={(nextSaved) => setSaved(video.videoId, nextSaved)}
                  />
                  <VideoDiscussButton videoId={video.videoId} videoTitle={video.title} />
                  <VideoTranscriptLabel videoId={video.videoId} videoTitle={video.title} />
                  <ShareVideoButton videoId={video.videoId} title={video.title} />
                  <Link href={href} className="vx-arrow">
                    <b>Přehrát</b>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/ikona_sipka.svg" alt="" />
                  </Link>
                </div>
              </div>
            </article>
            {index < videos.length - 1 ? (
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
