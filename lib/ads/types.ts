export const AD_PLACEMENTS = [
  "banner_top",
  "banner_bottom",
  "gate",
  "popup",
  "between_videos",
  "infeed_home_channels",
  "infeed_latest",
  "infeed_noviny",
  "infeed_nazory",
  "infeed_kanaly",
  "infeed_channels_tile",
] as const;

export type AdPlacement = (typeof AD_PLACEMENTS)[number];

export const AD_CUE_MODES = ["every_n", "before_title", "between_window"] as const;
export type AdCueMode = (typeof AD_CUE_MODES)[number];

export type AdUnit = {
  id: string;
  title: string;
  advertiser: string | null;
  placement: AdPlacement;
  every_n_videos: number;
  max_per_session: number;
  skip_after_sec: number;
  duration_sec: number;
  cue_mode: AdCueMode;
  cue_text: string | null;
  image_desktop: string | null;
  image_tablet: string | null;
  image_mobile: string | null;
  click_url: string | null;
  video_id: string | null;
  headline: string | null;
  body: string | null;
};

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function asInt(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
}

const MEDIA_NAME = /^[a-f0-9]{16}\.(jpg|jpeg|png|webp|gif)$/i;

export function rewriteAdAssetUrl(url: string | null): string | null {
  if (!url) return null;
  const fromPath = (pathname: string): string | null => {
    if (!pathname.startsWith("/ads/media/")) return null;
    const name = pathname.slice("/ads/media/".length);
    return MEDIA_NAME.test(name) ? `/api/ads/media/${name}` : null;
  };
  const direct = fromPath(url);
  if (direct) return direct;
  try {
    const parsed = new URL(url, "https://placeholder.local");
    return fromPath(parsed.pathname) ?? url;
  } catch {
    return url;
  }
}

export function parseAdUnit(raw: unknown): AdUnit | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const id = asString(row.id);
  const title = asString(row.title);
  const placement = asString(row.placement);
  if (!id || !title || !placement || !AD_PLACEMENTS.includes(placement as AdPlacement)) return null;
  const cueRaw = asString(row.cue_mode);
  const cue_mode: AdCueMode =
    cueRaw && AD_CUE_MODES.includes(cueRaw as AdCueMode) ? (cueRaw as AdCueMode) : "every_n";
  return {
    id,
    title,
    advertiser: asString(row.advertiser),
    placement: placement as AdPlacement,
    every_n_videos: Math.max(1, asInt(row.every_n_videos, 3)),
    max_per_session: Math.max(1, asInt(row.max_per_session, 1)),
    skip_after_sec: asInt(row.skip_after_sec, 8),
    duration_sec: Math.max(5, asInt(row.duration_sec, 15)),
    cue_mode,
    cue_text: asString(row.cue_text),
    image_desktop: rewriteAdAssetUrl(asString(row.image_desktop)),
    image_tablet: rewriteAdAssetUrl(asString(row.image_tablet)),
    image_mobile: rewriteAdAssetUrl(asString(row.image_mobile)),
    click_url: asString(row.click_url),
    video_id: asString(row.video_id),
    headline: asString(row.headline),
    body: asString(row.body),
  };
}

export function parseAdsPayload(raw: unknown): AdUnit[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const items = (raw as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];
  return items.map(parseAdUnit).filter((unit): unit is AdUnit => unit !== null);
}

export function isAdPreview(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("reklama") === "1";
  } catch {
    return false;
  }
}

export function pickAdImage(unit: AdUnit, width: number): string | null {
  if (width < 600) return unit.image_mobile || unit.image_tablet || unit.image_desktop;
  if (width < 1024) return unit.image_tablet || unit.image_desktop || unit.image_mobile;
  return unit.image_desktop || unit.image_tablet || unit.image_mobile;
}

export function shouldShowInfeedAt(afterIndex: number, everyN: number): boolean {
  const every = Math.max(1, everyN);
  return (afterIndex + 1) % every === 0;
}

export function pickInfeedUnit(units: AdUnit[], placement: AdPlacement, afterIndex: number): AdUnit | null {
  const pool = units.filter((unit) => unit.placement === placement);
  if (pool.length === 0) return null;
  const every = Math.max(1, pool[0].every_n_videos);
  if (!shouldShowInfeedAt(afterIndex, every)) return null;
  const slot = Math.floor((afterIndex + 1) / every) - 1;
  return pool[slot % pool.length] ?? null;
}

export function titleMatchesCue(programTitle: string | null | undefined, cueText: string | null): boolean {
  const needle = (cueText || "").trim().toLowerCase();
  if (!needle) return false;
  return (programTitle || "").trim().toLowerCase().includes(needle);
}

export function shouldInsertVideoAd(
  unit: AdUnit,
  moment: "before" | "between",
  programTitle: string | null | undefined,
  tick: number,
): boolean {
  if (unit.placement !== "between_videos") return false;
  const mode = unit.cue_mode || "every_n";
  if (moment === "before") {
    if (mode === "before_title") return titleMatchesCue(programTitle, unit.cue_text);
    return isAdPreview();
  }
  if (mode === "between_window") return true;
  if (mode === "every_n") {
    const every = isAdPreview() ? 1 : Math.max(1, unit.every_n_videos);
    return tick > 0 && tick % every === 0;
  }
  return false;
}

const SESSION_PREFIX = "vx-ad-shown:";

export function sessionShownCount(unitId: string): number {
  if (typeof window === "undefined") return 0;
  const raw = window.sessionStorage.getItem(SESSION_PREFIX + unitId);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

export function bumpSessionShown(unitId: string): number {
  const next = sessionShownCount(unitId) + 1;
  try {
    window.sessionStorage.setItem(SESSION_PREFIX + unitId, String(next));
  } catch {
    // private mode
  }
  return next;
}

export function canShowThisSession(unit: AdUnit): boolean {
  if (isAdPreview()) return true;
  return sessionShownCount(unit.id) < unit.max_per_session;
}

export function pickVideoAd(
  units: AdUnit[],
  moment: "before" | "between",
  programTitle: string | null | undefined,
  tick: number,
): AdUnit | null {
  return (
    units.find(
      (unit) =>
        unit.placement === "between_videos" &&
        canShowThisSession(unit) &&
        shouldInsertVideoAd(unit, moment, programTitle, tick),
    ) ?? null
  );
}

/** Krátké YouTube video jen pro lokální zkoušku s ?reklama=1, když v inventáři chybí brána / video. */
const PREVIEW_YT = "jNQXAC9IVRw";

function previewDemoUnit(partial: Partial<AdUnit> & Pick<AdUnit, "id" | "placement" | "title">): AdUnit {
  return {
    advertiser: "Zkouška",
    every_n_videos: 1,
    max_per_session: 99,
    skip_after_sec: 3,
    duration_sec: 12,
    cue_mode: "every_n",
    cue_text: null,
    image_desktop: null,
    image_tablet: null,
    image_mobile: null,
    click_url: null,
    video_id: PREVIEW_YT,
    headline: null,
    body: null,
    ...partial,
  };
}

export const PREVIEW_DEMO_UNITS: AdUnit[] = [
  previewDemoUnit({
    id: "preview-gate",
    placement: "gate",
    title: "Zkušební brána",
    headline: "Zkušební brána",
    body: "Tohle okno se ukáže jen s ?reklama=1. Po 3 sekundách můžete pokračovat.",
  }),
  previewDemoUnit({
    id: "preview-video",
    placement: "between_videos",
    title: "Zkušební video v přehrávači",
    headline: "Zkušební video reklama",
  }),
];

export function mergePreviewDemoUnits(units: AdUnit[]): AdUnit[] {
  if (!isAdPreview()) return units;
  const have = new Set(units.map((unit) => unit.placement));
  const extra = PREVIEW_DEMO_UNITS.filter((demo) => !have.has(demo.placement));
  return extra.length ? [...units, ...extra] : units;
}
