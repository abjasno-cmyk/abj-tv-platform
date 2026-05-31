import Link from "next/link";

import { MyVeroxSettings } from "@/components/auth/MyVeroxSettings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDurationLabel } from "@/lib/viewer/time";

export const dynamic = "force-dynamic";

type VideoProgressRow = {
  video_id: string;
  position_seconds: number;
  duration_seconds: number | null;
  progress_percent: number | null;
  completed: boolean;
  last_watched_at: string;
};

type ConsentRow = {
  consent_type: string;
  granted: boolean;
  created_at: string;
};

type VideoMeta = {
  title: string | null;
  channel_id: string | null;
  channel_name: string | null;
  thumbnail: string | null;
};

function readNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildYoutubeThumbnail(videoId: string): string | null {
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return null;
  return `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
}

export default async function MujVeroxPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <section className="rounded-[14px] border border-verox-line bg-white p-6 shadow-[0_8px_18px_rgba(17,17,17,0.10)]">
          <p className="vx-kicker text-verox-orangeDeep">Můj Verox</p>
          <h1 className="vx-display mt-3 text-verox-ink" style={{ fontSize: "clamp(1.7rem, 4vw, 2.4rem)" }}>
            Váš bezplatný divácký účet
          </h1>
          <hr className="vx-rule mt-4 h-[2px]" />
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-verox-charcoal">
            Přihlaste se zdarma a získejte sekce Rozkoukáno, Zhlédnuto, oblíbené kanály i osobní diskusi.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href="/live" className="vx-btn vx-btn--solid">
              Přihlásit zdarma
            </Link>
            <span className="vx-meta">Sledování obsahu zůstává zdarma.</span>
          </div>
        </section>
      </main>
    );
  }

  const [profileRes, progressRes, followsRes, commentsRes, consentsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, display_name, avatar_url, provider, role, created_at, updated_at, last_seen_at")
      .eq("id", user.id)
      .single(),
    supabase
      .from("video_progress")
      .select("video_id, position_seconds, duration_seconds, progress_percent, completed, last_watched_at")
      .eq("user_id", user.id)
      .order("last_watched_at", { ascending: false })
      .limit(60),
    supabase.from("follows").select("channel_id, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase
      .from("comments")
      .select("id, entity_type, entity_id, body, status, created_at, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("consents")
      .select("consent_type, granted, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const profile = profileRes.data;
  const allProgress = (progressRes.data ?? []) as VideoProgressRow[];
  const inProgress = allProgress.filter((row) => !row.completed).slice(0, 12);
  const completed = allProgress.filter((row) => row.completed).slice(0, 12);
  const followedChannels = followsRes.data ?? [];
  const myComments = commentsRes.data ?? [];
  const consents = (consentsRes.data ?? []) as ConsentRow[];

  const latestNewsletterConsent = consents.find((consent) => consent.consent_type === "newsletter");
  const newsletterGranted = latestNewsletterConsent?.granted === true;

  const videoIds = Array.from(new Set(allProgress.map((row) => row.video_id)));
  const videoMetaByVideoId = new Map<string, VideoMeta>();
  const videoChannelIds = new Set<string>();
  if (videoIds.length > 0) {
    const videoLookup = await supabase
      .from("videos")
      .select("video_id, title, channel_id, channel_name, thumbnail")
      .in("video_id", videoIds);
    for (const row of videoLookup.data ?? []) {
      const videoId = readNonEmptyString(row.video_id);
      if (!videoId) continue;
      const channelId = readNonEmptyString(row.channel_id);
      const channelName = readNonEmptyString(row.channel_name);
      const thumbnail = readNonEmptyString(row.thumbnail);
      const title = readNonEmptyString(row.title);
      if (channelId) videoChannelIds.add(channelId);
      videoMetaByVideoId.set(videoId, {
        title,
        channel_id: channelId,
        channel_name: channelName,
        thumbnail,
      });
    }
  }

  const channelIds = Array.from(new Set([...followedChannels.map((row) => row.channel_id), ...videoChannelIds]));
  const sourceNameByChannelId = new Map<string, string>();
  if (channelIds.length > 0) {
    const sourceLookup = await supabase
      .from("sources")
      .select("channel_id, source_name")
      .in("channel_id", channelIds)
      .limit(300);
    for (const row of sourceLookup.data ?? []) {
      if (row.channel_id && row.source_name) {
        sourceNameByChannelId.set(row.channel_id, row.source_name);
      }
    }
  }

  const getVideoMeta = (videoId: string) => {
    const meta = videoMetaByVideoId.get(videoId);
    const sourceName = meta?.channel_id ? sourceNameByChannelId.get(meta.channel_id) : null;
    return {
      channelName: meta?.channel_name ?? sourceName ?? "Neznámý kanál",
      title: meta?.title ?? null,
      thumbnail: meta?.thumbnail ?? buildYoutubeThumbnail(videoId) ?? "/placeholder-thumb.jpg",
    };
  };

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8">
      <section className="overflow-hidden bg-verox-orange p-6 text-white">
        <p className="text-[0.62rem] uppercase tracking-[0.18em]" style={{ fontFamily: "var(--vx-mono)" }}>
          Můj Verox
        </p>
        <h1 className="vx-display mt-3 text-white" style={{ fontSize: "clamp(1.7rem, 4vw, 2.4rem)" }}>
          Vítejte{profile?.display_name ? `, ${profile.display_name}` : ""} 👋
        </h1>
        <p className="mt-3 max-w-[52ch] text-[1rem] leading-relaxed text-white/95">
          Komentujte, lajkujte a pokračujte tam, kde jste skončili.
        </p>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-[14px] border border-verox-line bg-white p-5 shadow-[0_8px_18px_rgba(17,17,17,0.10)]">
          <h2 className="vx-display text-[1.4rem] leading-none text-verox-ink">Rozkoukáno</h2>
          <hr className="vx-rule mt-3 h-[2px]" />
          {inProgress.length === 0 ? (
            <p className="mt-3 text-sm text-verox-gray">Zatím tu nic není. Stačí začít sledovat video.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {inProgress.map((row) => (
                <li key={`in-progress-${row.video_id}`} className="rounded-[10px] border border-verox-line bg-verox-paper p-3">
                  {(() => {
                    const videoMeta = getVideoMeta(row.video_id);
                    return (
                      <div className="flex items-start gap-3">
                        <div className="h-14 w-24 shrink-0 overflow-hidden rounded-md border border-verox-line bg-[rgba(17,17,17,0.08)]">
                          <div
                            role="img"
                            aria-label={
                              videoMeta.title
                                ? `Náhled videa ${videoMeta.title}`
                                : `Náhled videa kanálu ${videoMeta.channelName}`
                            }
                            className="h-full w-full bg-cover bg-center"
                            style={{ backgroundImage: `url(${videoMeta.thumbnail})` }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="vx-kicker text-verox-gray">{videoMeta.channelName}</p>
                          {videoMeta.title ? <p className="mt-1 text-sm font-semibold text-verox-ink">{videoMeta.title}</p> : null}
                          <p className="vx-meta mt-1.5">
                            Pokračovat od {formatDurationLabel(row.position_seconds)} · {Math.round(row.progress_percent ?? 0)} %
                          </p>
                          <Link
                            href={`/live?videoId=${encodeURIComponent(row.video_id)}`}
                            className="vx-action mt-2"
                          >
                            Otevřít video →
                          </Link>
                        </div>
                      </div>
                    );
                  })()}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-[14px] border border-verox-line bg-white p-5 shadow-[0_8px_18px_rgba(17,17,17,0.10)]">
          <h2 className="vx-display text-[1.4rem] leading-none text-verox-ink">Zhlédnuto</h2>
          <hr className="vx-rule mt-3 h-[2px]" />
          {completed.length === 0 ? (
            <p className="mt-3 text-sm text-verox-gray">Zatím žádná dokončená videa.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {completed.map((row) => (
                <li key={`completed-${row.video_id}`} className="rounded-[10px] border border-verox-line bg-verox-paper p-3">
                  {(() => {
                    const videoMeta = getVideoMeta(row.video_id);
                    return (
                      <div className="flex items-start gap-3">
                        <div className="h-14 w-24 shrink-0 overflow-hidden rounded-md border border-verox-line bg-[rgba(17,17,17,0.08)]">
                          <div
                            role="img"
                            aria-label={
                              videoMeta.title
                                ? `Náhled videa ${videoMeta.title}`
                                : `Náhled videa kanálu ${videoMeta.channelName}`
                            }
                            className="h-full w-full bg-cover bg-center"
                            style={{ backgroundImage: `url(${videoMeta.thumbnail})` }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="vx-kicker text-verox-gray">{videoMeta.channelName}</p>
                          {videoMeta.title ? <p className="mt-1 text-sm font-semibold text-verox-ink">{videoMeta.title}</p> : null}
                          <p className="vx-meta mt-1.5">Dokončeno · {Math.round(row.progress_percent ?? 100)} %</p>
                        </div>
                      </div>
                    );
                  })()}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-[14px] border border-verox-line bg-white p-5 shadow-[0_8px_18px_rgba(17,17,17,0.10)]">
          <h2 className="vx-display text-[1.4rem] leading-none text-verox-ink">Oblíbené kanály</h2>
          <hr className="vx-rule mt-3 h-[2px]" />
          {followedChannels.length === 0 ? (
            <p className="mt-3 text-sm text-verox-gray">Ještě nemáte žádné oblíbené kanály.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {followedChannels.map((row) => (
                <li key={row.channel_id} className="rounded-[10px] border border-verox-line bg-verox-paper p-3">
                  <p className="text-sm font-semibold text-verox-ink">
                    {sourceNameByChannelId.get(row.channel_id) ?? row.channel_id}
                  </p>
                  <p className="vx-meta mt-1">{row.channel_id}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-[14px] border border-verox-line bg-white p-5 shadow-[0_8px_18px_rgba(17,17,17,0.10)]">
          <h2 className="vx-display text-[1.4rem] leading-none text-verox-ink">Moje komentáře</h2>
          <hr className="vx-rule mt-3 h-[2px]" />
          {myComments.length === 0 ? (
            <p className="mt-3 text-sm text-verox-gray">Zatím žádné komentáře.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {myComments.map((row) => (
                <li key={row.id} className="rounded-[10px] border border-verox-line bg-verox-paper p-3">
                  <p className="vx-kicker text-verox-gray">
                    {row.entity_type}: {row.entity_id}
                  </p>
                  <p className="mt-1.5 text-sm text-verox-ink">{row.body}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <MyVeroxSettings
        initialDisplayName={profile?.display_name ?? user.email?.split("@")[0] ?? "Divák VEROX"}
        initialNewsletterGranted={newsletterGranted}
      />
    </main>
  );
}
