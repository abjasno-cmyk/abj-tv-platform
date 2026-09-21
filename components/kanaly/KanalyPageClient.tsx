"use client";

import { Fragment, useCallback, useMemo, useState } from "react";

import type { LiveChannelGroup, LiveChannelVideo } from "@/components/abj/ChannelDirectory";
import { FollowChannelButton } from "@/components/auth/FollowChannelButton";
import { KanalyChannelVideos } from "@/components/kanaly/KanalyChannelVideos";
import { CHANNEL_VIDEO_LOOKBACK_DAYS, LIVE_CHANNEL_VIDEO_DISPLAY_LIMIT, LIVE_CHANNEL_VIDEO_EXPANDED_LIMIT } from "@/lib/liveChannelVideos";
import { fetchChannelVideosForKanaly, fetchExpandedChannelVideosForKanaly } from "@/lib/kanaly/channelVideosClient";
import { getDictionary } from "@/lib/i18n/dictionary";
import { useLocale } from "@/lib/i18n/useLocale";
import { normalizeChannelFollowId } from "@/lib/viewer/videoMetadata";
import { InfeedAd } from "@/components/ads/InfeedAd";

type KanalyPageClientProps = {
  channels: LiveChannelGroup[];
};

function ChannelAvatar({ channelName, avatarUrl }: { channelName: string; avatarUrl: string | null }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(avatarUrl) && !imageFailed;
  const initials = channelName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase() || "CH";

  return (
    <span className="kanaly-channel-avatar" aria-hidden="true">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl!} alt="" loading="lazy" onError={() => setImageFailed(true)} />
      ) : (
        <span className="kanaly-channel-avatar-fallback">{initials}</span>
      )}
    </span>
  );
}

export function KanalyPageClient({ channels }: KanalyPageClientProps) {
  const locale = useLocale();
  const dictionary = getDictionary(locale);
  const orderedChannels = useMemo(
    () => [...channels].sort((a, b) => a.channelName.localeCompare(b.channelName, "cs-CZ")),
    [channels],
  );

  const [openChannelName, setOpenChannelName] = useState<string | null>(null);
  const [videosByChannel, setVideosByChannel] = useState<Record<string, LiveChannelVideo[]>>({});
  const [fallbackByChannel, setFallbackByChannel] = useState<Record<string, boolean>>({});
  const [loadingChannel, setLoadingChannel] = useState<string | null>(null);
  const [errorByChannel, setErrorByChannel] = useState<Record<string, string>>({});
  const [expandedByChannel, setExpandedByChannel] = useState<Record<string, boolean>>({});
  const [expandLoadedByChannel, setExpandLoadedByChannel] = useState<Record<string, boolean>>({});
  const [expandLoadingChannel, setExpandLoadingChannel] = useState<string | null>(null);

  const selectChannel = useCallback(async (channel: LiveChannelGroup) => {
    if (openChannelName === channel.channelName) {
      setOpenChannelName(null);
      setExpandedByChannel((prev) => ({ ...prev, [channel.channelName]: false }));
      return;
    }

    setOpenChannelName(channel.channelName);

    if (Object.prototype.hasOwnProperty.call(videosByChannel, channel.channelName)) {
      return;
    }

    setLoadingChannel(channel.channelName);
    setErrorByChannel((prev) => ({ ...prev, [channel.channelName]: "" }));

    try {
      const result = await fetchChannelVideosForKanaly(channel, locale);
      setVideosByChannel((prev) => ({ ...prev, [channel.channelName]: result.videos }));
      setFallbackByChannel((prev) => ({ ...prev, [channel.channelName]: result.usedLatestFallback }));
      if (result.videos.length === 0) {
        setErrorByChannel((prev) => ({
          ...prev,
          [channel.channelName]: dictionary.channels.emptyChannel,
        }));
      }
    } catch {
      setVideosByChannel((prev) => ({ ...prev, [channel.channelName]: [] }));
      setFallbackByChannel((prev) => ({ ...prev, [channel.channelName]: false }));
      setErrorByChannel((prev) => ({
        ...prev,
        [channel.channelName]: dictionary.channels.loadError,
      }));
    } finally {
      setLoadingChannel(null);
    }
  }, [dictionary.channels.emptyChannel, dictionary.channels.loadError, locale, openChannelName, videosByChannel]);

  const expandChannel = useCallback(async (channel: LiveChannelGroup) => {
    const existing = videosByChannel[channel.channelName] ?? [];
    if (
      expandLoadedByChannel[channel.channelName] ||
      existing.length >= LIVE_CHANNEL_VIDEO_EXPANDED_LIMIT
    ) {
      setExpandedByChannel((prev) => ({ ...prev, [channel.channelName]: true }));
      return;
    }

    setExpandLoadingChannel(channel.channelName);
    setErrorByChannel((prev) => ({ ...prev, [channel.channelName]: "" }));
    try {
      const videos = await fetchExpandedChannelVideosForKanaly(channel, locale, existing);
      setVideosByChannel((prev) => ({ ...prev, [channel.channelName]: videos }));
      setFallbackByChannel((prev) => ({ ...prev, [channel.channelName]: false }));
      setExpandedByChannel((prev) => ({ ...prev, [channel.channelName]: true }));
      setExpandLoadedByChannel((prev) => ({ ...prev, [channel.channelName]: true }));
      if (videos.length === 0) {
        setErrorByChannel((prev) => ({
          ...prev,
          [channel.channelName]: dictionary.channels.emptyChannel,
        }));
      }
    } catch {
      setErrorByChannel((prev) => ({
        ...prev,
        [channel.channelName]: dictionary.channels.loadError,
      }));
    } finally {
      setExpandLoadingChannel(null);
    }
  }, [dictionary.channels.emptyChannel, dictionary.channels.loadError, expandLoadedByChannel, locale, videosByChannel]);

  return (
    <div className="kanaly-page">
      <p className="kanaly-lead">{dictionary.channels.lead(CHANNEL_VIDEO_LOOKBACK_DAYS)}</p>

      {orderedChannels.length === 0 ? (
        <p className="kanaly-empty">{dictionary.channels.emptyList}</p>
      ) : (
        <ul className="kanaly-list">
          {orderedChannels.map((channel, channelIndex) => {
            const isOpen = openChannelName === channel.channelName;
            const isLoading = loadingChannel === channel.channelName;
            const allVideos = videosByChannel[channel.channelName] ?? [];
            const expanded = expandedByChannel[channel.channelName] === true;
            const videos = expanded ? allVideos : allVideos.slice(0, LIVE_CHANNEL_VIDEO_DISPLAY_LIMIT);
            const usedFallback = fallbackByChannel[channel.channelName] === true;
            const expanding = expandLoadingChannel === channel.channelName;

            return (
              <Fragment key={channel.channelName}>
              <li className={`kanaly-item${isOpen ? " is-open" : ""}`}>
                <button
                  type="button"
                  className="kanaly-channel-trigger"
                  onClick={() => void selectChannel(channel)}
                  aria-expanded={isOpen}
                  aria-controls={`kanaly-panel-${channel.channelName}`}
                >
                  <ChannelAvatar channelName={channel.channelName} avatarUrl={channel.avatarUrl} />
                  <span className="kanaly-channel-name">{channel.channelName}</span>
                  <span className="kanaly-channel-chevron" aria-hidden="true">
                    {isOpen ? "▴" : "▾"}
                  </span>
                </button>

                {isOpen ? (
                  <div
                    id={`kanaly-panel-${channel.channelName}`}
                    className="kanaly-channel-panel"
                    aria-live="polite"
                  >
                    <div className="kanaly-channel-panel-head">
                      <p className="kanaly-channel-panel-label">{dictionary.channels.activeChannel}</p>
                      <div className="kanaly-channel-panel-row">
                        <p className="kanaly-channel-panel-name">{channel.channelName}</p>
                        <FollowChannelButton
                          channelId={normalizeChannelFollowId(channel.channelId, channel.channelName)}
                          channelName={channel.channelName}
                        />
                      </div>
                    </div>

                    {isLoading ? (
                      <p className="kanaly-channel-info">{dictionary.channels.loading(CHANNEL_VIDEO_LOOKBACK_DAYS)}</p>
                    ) : videos.length > 0 ? (
                      <>
                        {usedFallback && !expanded ? (
                          <p className="kanaly-channel-info kanaly-channel-fallback">
                            {dictionary.channels.fallback(CHANNEL_VIDEO_LOOKBACK_DAYS)}
                          </p>
                        ) : null}
                        <KanalyChannelVideos videos={videos} channelName={channel.channelName} />
                        <p className="kanaly-videos-toggle">
                          {expanded ? (
                            <button
                              type="button"
                              className="kanaly-videos-toggle-btn"
                              onClick={() =>
                                setExpandedByChannel((prev) => ({ ...prev, [channel.channelName]: false }))
                              }
                            >
                              {dictionary.channels.collapseVideos}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="kanaly-videos-toggle-btn"
                              onClick={() => void expandChannel(channel)}
                              disabled={expanding}
                            >
                              {expanding
                                ? dictionary.channels.loadingLatestVideos
                                : dictionary.channels.loadLatestVideos(LIVE_CHANNEL_VIDEO_EXPANDED_LIMIT)}
                            </button>
                          )}
                        </p>
                      </>
                    ) : (
                      <p className="kanaly-channel-info">
                        {errorByChannel[channel.channelName] ||
                          dictionary.channels.noRecentVideos(CHANNEL_VIDEO_LOOKBACK_DAYS)}
                      </p>
                    )}
                  </div>
                ) : null}
              </li>
              <InfeedAd placement="infeed_channels_tile" afterIndex={channelIndex} variant="tile" as="li" />
              <InfeedAd placement="infeed_kanaly" afterIndex={channelIndex} as="li" />
              </Fragment>
            );
          })}
        </ul>
      )}
    </div>
  );
}
