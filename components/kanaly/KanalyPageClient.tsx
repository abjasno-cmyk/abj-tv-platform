"use client";

import { useCallback, useMemo, useState } from "react";

import type { LiveChannelGroup, LiveChannelVideo } from "@/components/abj/ChannelDirectory";
import { FollowChannelButton } from "@/components/auth/FollowChannelButton";
import { ChannelSuggestionForm } from "@/components/kanaly/ChannelSuggestionForm";
import { KanalyChannelVideos } from "@/components/kanaly/KanalyChannelVideos";
import { CHANNEL_VIDEO_LOOKBACK_DAYS } from "@/lib/liveChannelVideos";
import { fetchChannelVideosForKanaly } from "@/lib/kanaly/channelVideosClient";
import { normalizeChannelFollowId } from "@/lib/viewer/videoMetadata";

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
  const orderedChannels = useMemo(
    () => [...channels].sort((a, b) => a.channelName.localeCompare(b.channelName, "cs-CZ")),
    [channels],
  );

  const [openChannelName, setOpenChannelName] = useState<string | null>(null);
  const [videosByChannel, setVideosByChannel] = useState<Record<string, LiveChannelVideo[]>>({});
  const [fallbackByChannel, setFallbackByChannel] = useState<Record<string, boolean>>({});
  const [loadingChannel, setLoadingChannel] = useState<string | null>(null);
  const [errorByChannel, setErrorByChannel] = useState<Record<string, string>>({});

  const selectChannel = useCallback(async (channel: LiveChannelGroup) => {
    if (openChannelName === channel.channelName) {
      setOpenChannelName(null);
      return;
    }

    setOpenChannelName(channel.channelName);

    if (Object.prototype.hasOwnProperty.call(videosByChannel, channel.channelName)) {
      return;
    }

    setLoadingChannel(channel.channelName);
    setErrorByChannel((prev) => ({ ...prev, [channel.channelName]: "" }));

    try {
      const result = await fetchChannelVideosForKanaly(channel);
      setVideosByChannel((prev) => ({ ...prev, [channel.channelName]: result.videos }));
      setFallbackByChannel((prev) => ({ ...prev, [channel.channelName]: result.usedLatestFallback }));
      if (result.videos.length === 0) {
        setErrorByChannel((prev) => ({
          ...prev,
          [channel.channelName]: `U tohoto kanálu teď nejsou dostupná videa.`,
        }));
      }
    } catch {
      setVideosByChannel((prev) => ({ ...prev, [channel.channelName]: [] }));
      setFallbackByChannel((prev) => ({ ...prev, [channel.channelName]: false }));
      setErrorByChannel((prev) => ({
        ...prev,
        [channel.channelName]: "Videa kanálu se nepodařilo načíst.",
      }));
    } finally {
      setLoadingChannel(null);
    }
  }, [openChannelName, videosByChannel]);

  return (
    <div className="kanaly-page">
      <p className="kanaly-lead">
        Vyberte kanál — zobrazí se videa za posledních {CHANNEL_VIDEO_LOOKBACK_DAYS} dní. Kliknutím na video
        přejdete do přehrávače.
      </p>

      {orderedChannels.length === 0 ? (
        <p className="kanaly-empty">Seznam kanálů se právě připravuje.</p>
      ) : (
        <ul className="kanaly-list">
          {orderedChannels.map((channel) => {
            const isOpen = openChannelName === channel.channelName;
            const isLoading = loadingChannel === channel.channelName;
            const videos = videosByChannel[channel.channelName] ?? [];
            const usedFallback = fallbackByChannel[channel.channelName] === true;

            return (
              <li key={channel.channelName} className={`kanaly-item${isOpen ? " is-open" : ""}`}>
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
                      <p className="kanaly-channel-panel-label">Aktivní kanál</p>
                      <div className="kanaly-channel-panel-row">
                        <p className="kanaly-channel-panel-name">{channel.channelName}</p>
                        <FollowChannelButton
                          channelId={normalizeChannelFollowId(channel.channelId, channel.channelName)}
                          channelName={channel.channelName}
                        />
                      </div>
                    </div>

                    {isLoading ? (
                      <p className="kanaly-channel-info">Načítám videa za posledních {CHANNEL_VIDEO_LOOKBACK_DAYS} dní…</p>
                    ) : videos.length > 0 ? (
                      <>
                        {usedFallback ? (
                          <p className="kanaly-channel-info kanaly-channel-fallback">
                            Za posledních {CHANNEL_VIDEO_LOOKBACK_DAYS} dní bez novinek — zobrazujeme nejnovější videa kanálu.
                          </p>
                        ) : null}
                        <KanalyChannelVideos videos={videos} channelName={channel.channelName} />
                      </>
                    ) : (
                      <p className="kanaly-channel-info">
                        {errorByChannel[channel.channelName] ||
                          `Za posledních ${CHANNEL_VIDEO_LOOKBACK_DAYS} dní nejsou u tohoto kanálu dostupná videa.`}
                      </p>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <ChannelSuggestionForm />
    </div>
  );
}
