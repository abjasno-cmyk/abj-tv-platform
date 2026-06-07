"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { SaveVideoButton } from "@/components/auth/SaveVideoButton";
import { SaveOpinionButton } from "@/components/nazory/SaveOpinionButton";
import type {
  MyVeroxLibraryPayload,
  ViewerLibraryChannel,
  ViewerLibraryOpinion,
  ViewerLibraryVideo,
} from "@/lib/viewer/myVeroxLibrary";
import { publicNazoryMediaUrl } from "@/lib/nazory/media";

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

function OpinionShelfCard({
  article,
  onUnsave,
}: {
  article: ViewerLibraryOpinion;
  onUnsave?: () => void;
}) {
  const heroUrl = publicNazoryMediaUrl(article.heroImagePath);
  return (
    <article className="mv-library-opinion-card">
      <Link href={article.href}>
        {heroUrl ? (
          <span className="mv-library-thumb">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroUrl} alt="" loading="lazy" />
          </span>
        ) : null}
        <span className="mv-library-opinion-title">{article.title}</span>
        {article.authorName ? <span className="mv-library-opinion-meta">{article.authorName}</span> : null}
      </Link>
      <SaveOpinionButton
        articleId={article.articleId}
        title={article.title}
        slug={article.slug}
        heroImagePath={article.heroImagePath}
        authorName={article.authorName}
        saved
        className="nazory-btn mv-library-unsave"
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

function ShelfCarousel({ children }: { children: React.ReactNode[] }) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  const scrollShelf = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    const maxLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    if (maxLeft <= 6) return;
    const currentLeft = Math.max(0, el.scrollLeft);
    const step = Math.max(180, el.clientWidth * 0.75);

    if (dir === 1) {
      const nextLeft = currentLeft + step;
      el.scrollTo({
        left: nextLeft >= maxLeft - 2 ? 0 : Math.min(maxLeft, nextLeft),
        behavior: "smooth",
      });
      return;
    }

    const nextLeft = currentLeft - step;
    el.scrollTo({
      left: currentLeft <= 2 ? maxLeft : Math.max(0, nextLeft),
      behavior: "smooth",
    });
  };

  return (
    <div className="mv-shelf-carousel">
      <button
        type="button"
        className="mv-shelf-nav mv-shelf-prev"
        onClick={() => scrollShelf(-1)}
        aria-label="Předchozí videa"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M15 5l-7 7 7 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div className="mv-shelf-track" ref={trackRef}>
        {children}
      </div>
      <button
        type="button"
        className="mv-shelf-nav mv-shelf-next"
        onClick={() => scrollShelf(1)}
        aria-label="Další videa"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M9 5l7 7-7 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

function ShelfSection({
  title,
  empty,
  carousel = false,
  children,
}: {
  title: string;
  empty: string;
  carousel?: boolean;
  children: React.ReactNode;
}) {
  const childList = Array.isArray(children) ? children : children ? [children] : [];
  const hasChildren = childList.length > 0;
  return (
    <section className="mv-library-section">
      <h3>{title}</h3>
      {hasChildren ? (
        carousel ? (
          <ShelfCarousel>{childList}</ShelfCarousel>
        ) : (
          <div className="mv-library-grid">{children}</div>
        )
      ) : (
        <p className="mv-library-empty">{empty}</p>
      )}
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
        const fallback =
          response.status >= 500
            ? "Knihovnu se nepodařilo načíst. Pravděpodobně chybí migrace databáze (tabulka saved_videos) — spusťte SQL skript 011_viewer_library.sql v Supabase."
            : "Nepodařilo se načíst vaši knihovnu.";
        setError(payload.error ?? fallback);
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
    savedOpinions: [],
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

      <ShelfSection title="Uložená videa" empty="Zatím nemáte uložená videa. Klepněte na ☆ Uložit video na stránce Živě nebo Videa.">
        {data.savedVideos.map((video) => (
          <VideoShelfCard key={`saved-${video.videoId}`} video={video} onUnsave={() => void loadLibrary()} />
        ))}
      </ShelfSection>

      <ShelfSection title="Uložené články Názorů" empty="Zatím nemáte uložené články. Na detailu článku klepněte na Uložit článek.">
        {data.savedOpinions.map((article) => (
          <OpinionShelfCard key={`opinion-${article.articleId}`} article={article} onUnsave={() => void loadLibrary()} />
        ))}
      </ShelfSection>

      <ShelfSection
        title="Pokračovat ve sledování"
        empty="Rozkoukaná videa se zde objeví automaticky po přihlášení a sledování na Živě."
        carousel
      >
        {data.continueWatching.map((video) => (
          <VideoShelfCard key={`continue-${video.videoId}`} video={video} />
        ))}
      </ShelfSection>

      <ShelfSection
        title="Zhlédnutá videa"
        empty="Po dohrání videa (cca 90 %) se tu zobrazí s odznakem Zhlédnuto."
        carousel
      >
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
