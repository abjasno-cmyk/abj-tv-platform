"use client";

import type { LiveChannelVideo } from "@/components/abj/ChannelDirectory";
import { SaveVideoButton } from "@/components/auth/SaveVideoButton";
import { ShareVideoButton } from "@/components/viewer/ShareVideoButton";
import { VideoDiscussButton } from "@/components/viewer/VideoDiscussButton";
import { VideoTranscriptLabel } from "@/components/viewer/VideoTranscriptLabel";
import { VideoReleaseDateBadge } from "@/components/viewer/VideoReleaseDateBadge";
import { ViewerVideoBadges } from "@/components/viewer/ViewerVideoBadges";
import { resolveVideoThumbnail } from "@/lib/viewer/videoMetadata";

type ChannelVideoTileProps = {
  video: LiveChannelVideo;
  channelName: string;
  saved?: boolean;
  watched?: boolean;
  onSelect: () => void;
  onSavedChange?: (saved: boolean) => void;
};

export function ChannelVideoTile({
  video,
  channelName,
  saved = false,
  watched = false,
  onSelect,
  onSavedChange,
}: ChannelVideoTileProps) {
  const thumbnail = resolveVideoThumbnail(video.videoId, video.thumbnail);

  return (
    <div className="channel-video-wrap">
      <button type="button" className="channel-video" onClick={onSelect}>
        <span className="cv-thumb">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumbnail} alt="" loading="lazy" />
          <ViewerVideoBadges watched={watched} saved={saved} />
          <VideoReleaseDateBadge publishedAt={video.publishedAt} videoType="vod" />
        </span>
        <span className="cv-title">{video.title}</span>
      </button>
      <div className="channel-video-actions nazory-detail-actions">
        <SaveVideoButton
          videoId={video.videoId}
          title={video.title}
          thumbnailUrl={thumbnail}
          channelName={channelName}
          saved={saved}
          onSavedChange={onSavedChange}
        />
        <VideoDiscussButton videoId={video.videoId} videoTitle={video.title} />
        <VideoTranscriptLabel videoId={video.videoId} videoTitle={video.title} compact />
        <ShareVideoButton videoId={video.videoId} title={video.title} />
      </div>
    </div>
  );
}
