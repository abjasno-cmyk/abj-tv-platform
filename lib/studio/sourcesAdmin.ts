import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export const SOURCE_PRIORITIES = ["A", "B", "C"] as const;
export type SourcePriority = (typeof SOURCE_PRIORITIES)[number];

export type SourceAdminRow = {
  id: string;
  sourceName: string;
  platform: string;
  channelUrl: string;
  channelId: string | null;
  uploadsPlaylistId: string | null;
  priority: SourcePriority;
  category: string | null;
  country: string | null;
  language: string | null;
  active: boolean;
  playlistRole: string | null;
  notes: string | null;
  needsAttention: boolean;
};

export type SourceCreateInput = {
  sourceName: string;
  channelUrl: string;
  priority: SourcePriority;
  category?: string | null;
  country?: string | null;
  language?: string | null;
  active?: boolean;
  playlistRole?: string | null;
  notes?: string | null;
};

export type SourceUpdateInput = Partial<SourceCreateInput>;

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "on") return true;
    if (normalized === "false" || normalized === "0" || normalized === "off") return false;
  }
  return fallback;
}

export function normalizeYoutubeChannelUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    if (!parsed.hostname.includes("youtube.com") && !parsed.hostname.includes("youtu.be")) {
      return trimmed;
    }
    parsed.hash = "";
    parsed.search = "";
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return trimmed;
  }
}

export function isValidYoutubeChannelUrl(value: string): boolean {
  const normalized = normalizeYoutubeChannelUrl(value);
  if (!normalized) return false;
  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host !== "youtube.com" && host !== "m.youtube.com") return false;
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return false;
    const [first, second] = parts;
    if (first.startsWith("@")) return true;
    if (first === "channel" && second) return true;
    if (first === "user" && second) return true;
    if (first === "c" && second) return true;
    return false;
  } catch {
    return false;
  }
}

export function parseSourcePriority(value: unknown): SourcePriority | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return SOURCE_PRIORITIES.includes(normalized as SourcePriority) ? (normalized as SourcePriority) : null;
}

export function parseSourceCreateInput(payload: Record<string, unknown>): { ok: true; value: SourceCreateInput } | { ok: false; error: string } {
  const sourceName = readString(payload.sourceName ?? payload.source_name);
  const channelUrl = normalizeYoutubeChannelUrl(readString(payload.channelUrl ?? payload.channel_url) ?? "");
  const priority = parseSourcePriority(payload.priority);

  if (!sourceName) return { ok: false, error: "Název kanálu je povinný." };
  if (!channelUrl) return { ok: false, error: "YouTube URL kanálu je povinná." };
  if (!isValidYoutubeChannelUrl(channelUrl)) {
    return { ok: false, error: "Neplatná YouTube URL. Použijte např. https://www.youtube.com/@handle" };
  }
  if (!priority) return { ok: false, error: "Priorita musí být A, B nebo C." };

  return {
    ok: true,
    value: {
      sourceName,
      channelUrl,
      priority,
      category: readString(payload.category),
      country: readString(payload.country) ?? "CZ",
      language: readString(payload.language) ?? "cs",
      active: readBoolean(payload.active, true),
      playlistRole: readString(payload.playlistRole ?? payload.playlist_role),
      notes: readString(payload.notes),
    },
  };
}

export function parseSourceUpdateInput(payload: Record<string, unknown>): { ok: true; value: SourceUpdateInput } | { ok: false; error: string } {
  const value: SourceUpdateInput = {};

  if ("sourceName" in payload || "source_name" in payload) {
    const sourceName = readString(payload.sourceName ?? payload.source_name);
    if (!sourceName) return { ok: false, error: "Název kanálu nesmí být prázdný." };
    value.sourceName = sourceName;
  }

  if ("channelUrl" in payload || "channel_url" in payload) {
    const channelUrl = normalizeYoutubeChannelUrl(readString(payload.channelUrl ?? payload.channel_url) ?? "");
    if (!channelUrl) return { ok: false, error: "YouTube URL kanálu nesmí být prázdná." };
    if (!isValidYoutubeChannelUrl(channelUrl)) {
      return { ok: false, error: "Neplatná YouTube URL. Použijte např. https://www.youtube.com/@handle" };
    }
    value.channelUrl = channelUrl;
  }

  if ("priority" in payload) {
    const priority = parseSourcePriority(payload.priority);
    if (!priority) return { ok: false, error: "Priorita musí být A, B nebo C." };
    value.priority = priority;
  }

  if ("category" in payload) value.category = readString(payload.category);
  if ("country" in payload) value.country = readString(payload.country);
  if ("language" in payload) value.language = readString(payload.language);
  if ("active" in payload) value.active = readBoolean(payload.active, true);
  if ("playlistRole" in payload || "playlist_role" in payload) {
    value.playlistRole = readString(payload.playlistRole ?? payload.playlist_role);
  }
  if ("notes" in payload) value.notes = readString(payload.notes);

  if (Object.keys(value).length === 0) {
    return { ok: false, error: "Žádná pole k aktualizaci." };
  }

  return { ok: true, value };
}

function mapSourceRow(row: Record<string, unknown>): SourceAdminRow | null {
  const id = readString(row.id);
  const sourceName = readString(row.source_name);
  const channelUrl = readString(row.channel_url);
  const priority = parseSourcePriority(row.priority);
  if (!id || !sourceName || !channelUrl || !priority) return null;

  const channelId = readString(row.channel_id);
  const uploadsPlaylistId = readString(row.uploads_playlist_id);
  const needsAttention = !channelId || !uploadsPlaylistId;

  return {
    id,
    sourceName,
    platform: readString(row.platform) ?? "youtube",
    channelUrl,
    channelId,
    uploadsPlaylistId,
    priority,
    category: readString(row.category),
    country: readString(row.country),
    language: readString(row.language),
    active: row.active !== false,
    playlistRole: readString(row.playlist_role),
    notes: readString(row.notes),
    needsAttention,
  };
}

export async function listSourcesForAdmin(supabase: SupabaseClient): Promise<SourceAdminRow[]> {
  const { data, error } = await supabase
    .from("sources")
    .select(
      "id, source_name, platform, channel_url, channel_id, uploads_playlist_id, priority, category, country, language, active, playlist_role, notes",
    )
    .eq("platform", "youtube")
    .order("source_name", { ascending: true });

  if (error) {
    throw new Error(`Načtení kanálů selhalo: ${error.message}`);
  }

  return ((data ?? []) as Array<Record<string, unknown>>)
    .map((row) => mapSourceRow(row))
    .filter((row): row is SourceAdminRow => Boolean(row));
}

export async function createSourceForAdmin(
  supabase: SupabaseClient,
  input: SourceCreateInput,
): Promise<SourceAdminRow> {
  const { data: existing, error: existingError } = await supabase
    .from("sources")
    .select("id")
    .eq("platform", "youtube")
    .eq("channel_url", input.channelUrl)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Kontrola duplicity selhala: ${existingError.message}`);
  }
  if (existing) {
    throw new Error("Kanál s touto YouTube URL už v databázi existuje.");
  }

  const { data, error } = await supabase
    .from("sources")
    .insert({
      source_name: input.sourceName,
      platform: "youtube",
      channel_url: input.channelUrl,
      priority: input.priority,
      category: input.category,
      country: input.country,
      language: input.language,
      active: input.active ?? true,
      playlist_role: input.playlistRole,
      notes: input.notes,
    })
    .select(
      "id, source_name, platform, channel_url, channel_id, uploads_playlist_id, priority, category, country, language, active, playlist_role, notes",
    )
    .single();

  if (error) {
    throw new Error(`Vytvoření kanálu selhalo: ${error.message}`);
  }

  const mapped = mapSourceRow(data as Record<string, unknown>);
  if (!mapped) {
    throw new Error("Vytvořený kanál se nepodařilo načíst.");
  }
  return mapped;
}

export async function updateSourceForAdmin(
  supabase: SupabaseClient,
  sourceId: string,
  input: SourceUpdateInput,
): Promise<SourceAdminRow> {
  const patch: Record<string, unknown> = {};

  if (input.sourceName !== undefined) patch.source_name = input.sourceName;
  if (input.channelUrl !== undefined) {
    patch.channel_url = input.channelUrl;
    patch.channel_id = null;
    patch.uploads_playlist_id = null;
  }
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.category !== undefined) patch.category = input.category;
  if (input.country !== undefined) patch.country = input.country;
  if (input.language !== undefined) patch.language = input.language;
  if (input.active !== undefined) patch.active = input.active;
  if (input.playlistRole !== undefined) patch.playlist_role = input.playlistRole;
  if (input.notes !== undefined) patch.notes = input.notes;

  if (input.channelUrl !== undefined) {
    const { data: duplicate, error: duplicateError } = await supabase
      .from("sources")
      .select("id")
      .eq("platform", "youtube")
      .eq("channel_url", input.channelUrl)
      .neq("id", sourceId)
      .maybeSingle();

    if (duplicateError) {
      throw new Error(`Kontrola duplicity selhala: ${duplicateError.message}`);
    }
    if (duplicate) {
      throw new Error("Jiný kanál už používá tuto YouTube URL.");
    }
  }

  const { data, error } = await supabase
    .from("sources")
    .update(patch)
    .eq("id", sourceId)
    .select(
      "id, source_name, platform, channel_url, channel_id, uploads_playlist_id, priority, category, country, language, active, playlist_role, notes",
    )
    .single();

  if (error) {
    throw new Error(`Aktualizace kanálu selhala: ${error.message}`);
  }

  const mapped = mapSourceRow(data as Record<string, unknown>);
  if (!mapped) {
    throw new Error("Aktualizovaný kanál se nepodařilo načíst.");
  }
  return mapped;
}
