"use client";

import { useMemo, useState } from "react";
import YouTube, { type YouTubeProps } from "react-youtube";

type TVPlayerProps = {
  videoId: string | null;
  title: string;
  channelName: string;
};

function buildIframeSrc(videoId: string, muted: boolean): string {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: muted ? "1" : "0",
    modestbranding: "1",
    rel: "0",
    iv_load_policy: "3",
  });
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

export default function TVPlayer({ videoId, title, channelName }: TVPlayerProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [showUnmuteButton, setShowUnmuteButton] = useState(true);

  const playerOptions = useMemo<YouTubeProps["opts"]>(
    () => ({
      width: "100%",
      height: "100%",
    }),
    []
  );

  if (!videoId) {
    return (
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
        <div className="relative w-full rounded-2xl bg-[var(--surface-warm)]" style={{ paddingTop: "56.25%" }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-[var(--text-soft)]">Dnes není plánované vysílání</p>
          </div>
        </div>
      </section>
    );
  }

  const iframeSrc = buildIframeSrc(videoId, isMuted);

  return (
    <section className="rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.6)] bg-[var(--surface)] border border-[var(--border)]">
      <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
        <YouTube
          key={`${videoId}-${isMuted ? "muted" : "unmuted"}`}
          videoId={videoId}
          title={title}
          iframeClassName="absolute inset-0 w-full h-full"
          opts={playerOptions}
          onReady={(event) => {
            // Keep source exactly as specified including mute toggle behavior.
            event.target.getIframe().src = iframeSrc;
          }}
        />

        {showUnmuteButton ? (
          <button
            type="button"
            onClick={() => {
              setIsMuted(false);
              setShowUnmuteButton(false);
            }}
            className="absolute top-3 right-3 z-10 rounded-lg bg-black/60 px-3 py-1.5 text-sm text-white min-h-12 transition-all duration-200 ease-out"
          >
            🔊 Zapnout zvuk
          </button>
        ) : null}

        <div className="absolute bottom-0 left-0 z-10 h-10 w-28 cursor-default pointer-events-auto bg-transparent" />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/75 to-transparent" />
      </div>

      <div className="p-4">
        <p className="text-xs uppercase tracking-wider text-[var(--text-soft)]">{channelName}</p>
        <h2 className="mt-1 text-base font-medium text-[var(--text-main)]">{title}</h2>
      </div>
    </section>
  );
}
