"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type WallStatus = "pending" | "approved" | "rejected" | "hidden" | "flagged";

type ModerationLog = {
  id: string;
  action: string;
  reason: string | null;
  moderator: string | null;
  created_at: string;
};

type AdminPost = {
  id: string;
  author_name: string;
  author_email: string | null;
  body: string;
  status: WallStatus;
  video_id: string | null;
  video_title: string | null;
  parent_id: string | null;
  likes_count: number;
  reports_count: number;
  created_at: string;
  moderation_log: ModerationLog[];
};

type AdminListResponse = {
  posts: AdminPost[];
  hasMore: boolean;
};

const STATUS_OPTIONS: Array<{ value: WallStatus; label: string }> = [
  { value: "pending", label: "Čekající" },
  { value: "approved", label: "Schválené" },
  { value: "flagged", label: "Nahlášené" },
  { value: "hidden", label: "Skryté" },
  { value: "rejected", label: "Zamítnuté" },
];

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "čas neuveden";
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function AdminWallClient() {
  const [secret, setSecret] = useState("");
  const [status, setStatus] = useState<WallStatus>("pending");
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const authHeaders = useMemo(
    () => ({
      "x-admin-secret": secret,
      "x-admin-user": "abj-admin",
    }),
    [secret]
  );

  const load = useCallback(async () => {
    if (!secret.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/wall/posts?status=${status}`, {
        headers: authHeaders,
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as AdminListResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Načtení admin přehledu selhalo.");
      }
      setPosts(payload.posts ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Načtení admin přehledu selhalo.");
    } finally {
      setLoading(false);
    }
  }, [authHeaders, secret, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (postId: string, action: "approve" | "reject" | "hide" | "flag") => {
    if (!secret.trim()) return;
    try {
      const reason = window.prompt("Volitelný důvod moderační akce:", "");
      const response = await fetch(`/api/admin/wall/posts/${encodeURIComponent(postId)}/${action}`, {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: reason ?? null }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Moderační akce selhala.");
      }
      setInfo("Moderační akce byla provedena.");
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Moderační akce selhala.");
    }
  };

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <header className="rounded-2xl border border-[var(--abj-gold-dim)] bg-abj-panel p-5">
        <p className="text-[11px] uppercase tracking-[0.14em] text-abj-text2">Admin</p>
        <h1 className="mt-2 font-[var(--font-serif)] text-3xl font-semibold text-abj-text1">Moderace Zdi</h1>
        <p className="mt-2 text-sm text-abj-text2">
          TODO: napojit na centrální admin auth. Dočasně je vyžadován `WALL_ADMIN_SECRET`.
        </p>
      </header>

      <section className="rounded-2xl border border-[var(--abj-gold-dim)] bg-white p-4">
        <label className="space-y-1">
          <span className="text-sm font-medium text-abj-text1">Admin secret</span>
          <input
            type="password"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            className="w-full rounded-lg border border-[var(--abj-gold-dim)] px-3 py-2 text-sm outline-none focus:border-[#FF6A00]"
            placeholder="Vložte WALL_ADMIN_SECRET"
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatus(option.value)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] ${
                status === option.value
                  ? "border-[#FF6A00] bg-[rgba(255,106,0,0.1)] text-[#FF6A00]"
                  : "border-[var(--abj-gold-dim)] text-abj-text2"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {info ? <p className="mt-3 text-sm text-abj-text1">{info}</p> : null}
        {error ? <p className="mt-2 text-sm text-[#D14A2A]">{error}</p> : null}
      </section>

      {loading ? (
        <p className="rounded-xl border border-[var(--abj-gold-dim)] bg-abj-panel px-4 py-4 text-sm text-abj-text2">
          Načítám moderaci...
        </p>
      ) : posts.length === 0 ? (
        <p className="rounded-xl border border-[var(--abj-gold-dim)] bg-abj-panel px-4 py-4 text-sm text-abj-text2">
          Pro zvolený filtr nejsou žádné příspěvky.
        </p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <article key={post.id} className="rounded-2xl border border-[var(--abj-gold-dim)] bg-white p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.08em] text-abj-text2">
                <span>{post.status}</span>
                <span>•</span>
                <span>{formatTime(post.created_at)}</span>
                <span>•</span>
                <span>Souhlasy: {post.likes_count}</span>
                <span>•</span>
                <span>Nahlášení: {post.reports_count}</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-abj-text1">{post.author_name}</p>
              {post.author_email ? <p className="text-xs text-abj-text2">{post.author_email}</p> : null}
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-abj-text1">{post.body}</p>

              <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-abj-text2 sm:grid-cols-2">
                <p>video_id: {post.video_id ?? "—"}</p>
                <p>parent_id: {post.parent_id ?? "—"}</p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-[rgba(255,106,0,0.35)] bg-[rgba(255,106,0,0.08)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#FF6A00]"
                  onClick={() => {
                    void runAction(post.id, "approve");
                  }}
                >
                  Schválit
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-[var(--abj-gold-dim)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-abj-text2"
                  onClick={() => {
                    void runAction(post.id, "reject");
                  }}
                >
                  Zamítnout
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-[var(--abj-gold-dim)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-abj-text2"
                  onClick={() => {
                    void runAction(post.id, "hide");
                  }}
                >
                  Skrýt
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-[var(--abj-gold-dim)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-abj-text2"
                  onClick={() => {
                    void runAction(post.id, "flag");
                  }}
                >
                  Označit
                </button>
              </div>

              {post.moderation_log.length > 0 ? (
                <div className="mt-4 rounded-lg border border-[var(--abj-gold-dim)] bg-abj-panel p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-abj-text2">Moderační log</p>
                  <ul className="mt-2 space-y-1">
                    {post.moderation_log.slice(0, 5).map((log) => (
                      <li key={log.id} className="text-xs text-abj-text2">
                        {formatTime(log.created_at)} · {log.action} · {log.moderator ?? "admin"}
                        {log.reason ? ` · ${log.reason}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

