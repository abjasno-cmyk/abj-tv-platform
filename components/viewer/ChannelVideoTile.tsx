"use client";

import type { LiveChannelVideo } from "@/components/abj/ChannelDirectory";
import { SaveVideoButton } from "@/components/auth/SaveVideoButton";
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
      <SaveVideoButton
        videoId={video.videoId}
        title={video.title}
        thumbnailUrl={thumbnail}
        channelName={channelName}
        saved={saved}
        compact
        className="channel-video-save"
        onSavedChange={onSavedChange}
      />
    </div>
  );
}
