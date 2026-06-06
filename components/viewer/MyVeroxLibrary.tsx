"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { SaveVideoButton } from "@/components/auth/SaveVideoButton";
import type { MyVeroxLibraryPayload, ViewerLibraryChannel, ViewerLibraryVideo } from "@/lib/viewer/myVeroxLibrary";

function VideoShelfCard({
  video,
  onUnsave,
}: {
  video: ViewerLibraryVideo;
  onUnsave?: () => void;
}) {
  return (
    <article className="mv-library-card">
      <Link href={video.href} className="mv-library-card-link">
        <span className="mv-library-thumb">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={video.thumbnailUrl} alt="" loading="lazy" />
          {video.completed ? <span className="mv-library-badge">Zhlédnuto</span> : null}
        </span>
        <span className="mv-library-body">
          <span className="mv-library-title">{video.title}</span>
          {video.channelName ? <span className="mv-library-channel">{video.channelName}</span> : null}
          {typeof video.progressPercent === "number" && !video.completed ? (
            <span className="mv-library-progress">Rozkoukano {Math.round(video.progressPercent)} %</span>
          ) : null}
        </span>
      </Link>
      <SaveVideoButton
        videoId={video.videoId}
        title={video.title}
        thumbnailUrl={video.thumbnailUrl}
        channelName={video.channelName}
        saved
        compact
        className="mv-library-unsave"
        onSavedChange={(saved) => {
          if (!saved) onUnsave?.();
        }}
      />
    </article>
  );
}

function ChannelShelfCard({ channel }: { channel: ViewerLibraryChannel }) {
  return (
    <Link href={channel.href} className="mv-library-channel-card">
      <span className="mv-library-channel-avatar">
        {channel.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={channel.avatarUrl} alt="" />
        ) : (
          <span aria-hidden="true">★</span>
        )}
      </span>
      <span className="mv-library-channel-name">{channel.channelName}</span>
      <span className="mv-library-channel-label">Oblíbený kanál</span>
    </Link>
  );
}

function ShelfSection({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section className="mv-library-section">
      <h3>{title}</h3>
      {hasChildren ? <div className="mv-library-grid">{children}</div> : <p className="mv-library-empty">{empty}</p>}
    </section>
  );
}

export function MyVeroxLibrary() {
  const { isAuthenticated, openLoginModal } = useAuth();
  const [library, setLibrary] = useState<MyVeroxLibraryPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLibrary = useCallback(async () => {
    if (!isAuthenticated) {
      setLibrary(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/viewer/my-verox", { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as {
        library?: MyVeroxLibraryPayload;
        error?: string;
      };
      if (!response.ok) {
        setError(payload.error ?? "Nepodařilo se načíst vaši knihovnu.");
        setLibrary(null);
        return;
      }
      setLibrary(payload.library ?? null);
    } catch {
      setError("Nepodařilo se načíst vaši knihovnu.");
      setLibrary(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);

  if (!isAuthenticated) {
    return (
      <section className="mv-library">
        <h2 className="mv-library-heading">VAŠE VIDEA A KANÁLY</h2>
        <p className="mv-library-lead">
          Po přihlášení uvidíte uložená videa, rozkoukané pořady a oblíbené kanály.
        </p>
        <button
          type="button"
          className="mv-library-login"
          onClick={() => openLoginModal({ reason: "Přihlaste se zdarma a mějte svá videa na jednom místě." })}
        >
          Přihlásit zdarma
        </button>
      </section>
    );
  }

  if (loading && !library) {
    return (
      <section className="mv-library">
        <h2 className="mv-library-heading">VAŠE VIDEA A KANÁLY</h2>
        <p className="mv-library-empty">Načítám vaši knihovnu…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mv-library">
        <h2 className="mv-library-heading">VAŠE VIDEA A KANÁLY</h2>
        <p className="mv-library-empty">{error}</p>
      </section>
    );
  }

  const data = library ?? {
    savedVideos: [],
    watchedVideos: [],
    continueWatching: [],
    followedChannels: [],
  };

  return (
    <section className="mv-library">
      <h2 className="mv-library-heading">VAŠE VIDEA A KANÁLY</h2>
      <p className="mv-library-lead">
        Uložená videa, historie sledování a oblíbené kanály — vše na jednom místě.
      </p>

      <ShelfSection title="Uložená videa" empty="Zatím nemáte uložená videa. Na stránce Živě je u každého videa tlačítko ☆ Uložit.">
        {data.savedVideos.map((video) => (
          <VideoShelfCard key={`saved-${video.videoId}`} video={video} onUnsave={() => void loadLibrary()} />
        ))}
      </ShelfSection>

      <ShelfSection
        title="Pokračovat ve sledování"
        empty="Rozkoukaná videa se zde objeví automaticky po přihlášení a sledování na Živě."
      >
        {data.continueWatching.map((video) => (
          <VideoShelfCard key={`continue-${video.videoId}`} video={video} />
        ))}
      </ShelfSection>

      <ShelfSection title="Zhlédnutá videa" empty="Po dohrání videa (cca 90 %) se tu zobrazí s odznakem Zhlédnuto.">
        {data.watchedVideos.map((video) => (
          <VideoShelfCard key={`watched-${video.videoId}`} video={video} />
        ))}
      </ShelfSection>

      <ShelfSection
        title="Oblíbené kanály"
        empty="U kanálů na stránce Živě klepněte na ☆ Uložit a přidejte kanál mezi oblíbené."
      >
        {data.followedChannels.map((channel) => (
          <ChannelShelfCard key={channel.channelId} channel={channel} />
        ))}
      </ShelfSection>
    </section>
  );
}
