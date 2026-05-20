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

export default async function MujVeroxPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <section className="rounded-2xl border border-[var(--abj-gold-dim)] bg-white p-6 shadow-[0_10px_24px_rgba(17,17,17,0.08)]">
          <p className="text-xs uppercase tracking-[0.14em] text-abj-text2">Můj Verox</p>
          <h1 className="mt-2 text-3xl font-extrabold text-abj-text1">Váš bezplatný divácký účet</h1>
          <p className="mt-3 max-w-2xl text-sm text-abj-text2">
            Přihlaste se zdarma a získejte sekce Rozkoukáno, Zhlédnuto, oblíbené kanály i osobní diskusi.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/live"
              className="inline-flex min-h-10 items-center rounded-full border border-[#FF6A00] bg-[#FF6A00] px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white"
            >
              Přihlásit zdarma
            </Link>
            <span className="inline-flex min-h-10 items-center rounded-full border border-[var(--abj-gold-dim)] px-4 py-2 text-xs text-abj-text2">
              Sledování obsahu zůstává zdarma.
            </span>
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
  const titlesByVideoId = new Map<string, string>();
  if (videoIds.length > 0) {
    const videoLookup = await supabase.from("videos").select("video_id, title").in("video_id", videoIds);
    for (const row of videoLookup.data ?? []) {
      if (row.video_id && row.title) {
        titlesByVideoId.set(row.video_id, row.title);
      }
    }
  }

  const channelIds = followedChannels.map((row) => row.channel_id);
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

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
      <section className="rounded-2xl border border-[var(--abj-gold-dim)] bg-white p-5 shadow-[0_10px_24px_rgba(17,17,17,0.08)]">
        <p className="text-xs uppercase tracking-[0.14em] text-abj-text2">Můj Verox</p>
        <h1 className="mt-2 text-3xl font-extrabold text-abj-text1">
          Vítejte{profile?.display_name ? `, ${profile.display_name}` : ""} 👋
        </h1>
        <p className="mt-2 text-sm text-abj-text2">Komentujte, lajkujte a pokračujte tam, kde jste skončili.</p>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-[var(--abj-gold-dim)] bg-white p-4">
          <h2 className="text-lg font-extrabold text-abj-text1">Rozkoukáno</h2>
          {inProgress.length === 0 ? (
            <p className="mt-2 text-sm text-abj-text2">Zatím tu nic není. Stačí začít sledovat video.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {inProgress.map((row) => (
                <li key={`in-progress-${row.video_id}`} className="rounded-lg border border-[var(--abj-gold-dim)] bg-abj-panel p-3">
                  <p className="text-sm font-semibold text-abj-text1">{titlesByVideoId.get(row.video_id) ?? row.video_id}</p>
                  <p className="mt-1 text-xs text-abj-text2">
                    Pokračovat od {formatDurationLabel(row.position_seconds)} · {Math.round(row.progress_percent ?? 0)} %
                  </p>
                  <Link
                    href={`/live?videoId=${encodeURIComponent(row.video_id)}`}
                    className="mt-2 inline-flex text-xs font-semibold uppercase tracking-[0.08em] text-[#B04A00]"
                  >
                    Otevřít video →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--abj-gold-dim)] bg-white p-4">
          <h2 className="text-lg font-extrabold text-abj-text1">Zhlédnuto</h2>
          {completed.length === 0 ? (
            <p className="mt-2 text-sm text-abj-text2">Zatím žádná dokončená videa.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {completed.map((row) => (
                <li key={`completed-${row.video_id}`} className="rounded-lg border border-[var(--abj-gold-dim)] bg-abj-panel p-3">
                  <p className="text-sm font-semibold text-abj-text1">{titlesByVideoId.get(row.video_id) ?? row.video_id}</p>
                  <p className="mt-1 text-xs text-abj-text2">Dokončeno · {Math.round(row.progress_percent ?? 100)} %</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--abj-gold-dim)] bg-white p-4">
          <h2 className="text-lg font-extrabold text-abj-text1">Oblíbené kanály</h2>
          {followedChannels.length === 0 ? (
            <p className="mt-2 text-sm text-abj-text2">Ještě nemáte žádné oblíbené kanály.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {followedChannels.map((row) => (
                <li key={row.channel_id} className="rounded-lg border border-[var(--abj-gold-dim)] bg-abj-panel p-3">
                  <p className="text-sm font-semibold text-abj-text1">
                    {sourceNameByChannelId.get(row.channel_id) ?? row.channel_id}
                  </p>
                  <p className="mt-1 text-xs text-abj-text2">{row.channel_id}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--abj-gold-dim)] bg-white p-4">
          <h2 className="text-lg font-extrabold text-abj-text1">Moje komentáře</h2>
          {myComments.length === 0 ? (
            <p className="mt-2 text-sm text-abj-text2">Zatím žádné komentáře.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {myComments.map((row) => (
                <li key={row.id} className="rounded-lg border border-[var(--abj-gold-dim)] bg-abj-panel p-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-abj-text2">
                    {row.entity_type}: {row.entity_id}
                  </p>
                  <p className="mt-1 text-sm text-abj-text1">{row.body}</p>
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
