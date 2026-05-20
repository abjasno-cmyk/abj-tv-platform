"use client";

type AnalyticsEventName =
  | "page_view"
  | "video_start"
  | "video_progress"
  | "video_complete"
  | "video_pause"
  | "like_click"
  | "comment_submit"
  | "login_start"
  | "login_success"
  | "news_open"
  | "jasne_zpravy_open"
  | "breaking_view"
  | "breaking_click"
  | "channel_open"
  | "search"
  | "follow_channel"
  | "resume_video"
  | "live_open"
  | "archive_open";

type TrackPayload = {
  event_name: AnalyticsEventName;
  entity_type?: string;
  entity_id?: string;
  session_id?: string;
  anonymous_id?: string;
  properties?: Record<string, unknown>;
};

const progressStateByVideo = new Map<string, { sentAt: number; progressPercent: number }>();

function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  const key = "verox_session_id_v1";
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const generated = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.sessionStorage.setItem(key, generated);
  return generated;
}

function getAnonymousId(): string {
  if (typeof window === "undefined") return "anon";
  const key = "verox_anonymous_id_v1";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const generated = `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(key, generated);
  return generated;
}

export function trackAnalyticsEvent(payload: TrackPayload): void {
  void fetch("/api/analytics/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      session_id: payload.session_id ?? getSessionId(),
      anonymous_id: payload.anonymous_id ?? getAnonymousId(),
    }),
    keepalive: true,
  }).catch(() => {
    // Analytics tracking must never break UX.
  });
}

export function trackVideoProgressThrottled(params: {
  videoId: string;
  positionSeconds: number;
  durationSeconds: number;
}): void {
  if (!params.videoId || params.durationSeconds <= 0) return;
  const now = Date.now();
  const progressPercent = Math.max(0, Math.min(100, (params.positionSeconds / params.durationSeconds) * 100));
  const state = progressStateByVideo.get(params.videoId);
  const shouldSend =
    !state ||
    now - state.sentAt >= 12_000 ||
    Math.abs(progressPercent - state.progressPercent) >= 10 ||
    progressPercent >= 95;
  if (!shouldSend) return;

  progressStateByVideo.set(params.videoId, { sentAt: now, progressPercent });
  trackAnalyticsEvent({
    event_name: progressPercent >= 95 ? "video_complete" : "video_progress",
    entity_type: "video",
    entity_id: params.videoId,
    properties: {
      position_seconds: Math.floor(params.positionSeconds),
      duration_seconds: Math.floor(params.durationSeconds),
      progress_percent: Math.round(progressPercent * 100) / 100,
    },
  });
}
