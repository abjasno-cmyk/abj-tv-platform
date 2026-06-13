import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolveChannelIdsFromChannelUrl } from "@/lib/youtubeChannelResolve";

export type SourceChannelRow = {
  id: string;
  source_name: string;
  channel_url: string;
  channel_id: string | null;
  uploads_playlist_id: string | null;
};

export type SyncSourceChannelIdsMode = "missing" | "all";

export type SyncSourceChannelIdsResult = {
  scanned: number;
  updated: number;
  unchanged: number;
  failed: number;
  details: Array<{
    sourceName: string;
    status: "updated" | "unchanged" | "failed" | "skipped";
    message?: string;
  }>;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function loadYoutubeSourcesForSync(
  supabase: SupabaseClient,
  mode: SyncSourceChannelIdsMode
): Promise<SourceChannelRow[]> {
  let query = supabase
    .from("sources")
    .select("id, source_name, channel_url, channel_id, uploads_playlist_id")
    .eq("platform", "youtube")
    .eq("active", true)
    .order("priority", { ascending: true })
    .order("source_name", { ascending: true });

  if (mode === "missing") {
    query = query.or("channel_id.is.null,uploads_playlist_id.is.null");
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load sources: ${error.message}`);
  }

  return (data ?? []) as SourceChannelRow[];
}

export async function syncSourceChannelIds(input: {
  supabase: SupabaseClient;
  youtubeApiKey: string;
  mode: SyncSourceChannelIdsMode;
  throttleMs?: number;
}): Promise<SyncSourceChannelIdsResult> {
  const throttleMs = input.throttleMs ?? 150;
  const sources = await loadYoutubeSourcesForSync(input.supabase, input.mode);

  const result: SyncSourceChannelIdsResult = {
    scanned: 0,
    updated: 0,
    unchanged: 0,
    failed: 0,
    details: [],
  };

  for (const source of sources) {
    result.scanned += 1;
    const channelUrl = source.channel_url?.trim() ?? "";
    if (!channelUrl) {
      result.failed += 1;
      result.details.push({
        sourceName: source.source_name,
        status: "skipped",
        message: "missing channel_url",
      });
      await sleep(throttleMs);
      continue;
    }

    try {
      const resolved = await resolveChannelIdsFromChannelUrl(channelUrl, input.youtubeApiKey);
      if (!resolved) {
        result.failed += 1;
        result.details.push({
          sourceName: source.source_name,
          status: "failed",
          message: "unable to resolve from channel_url",
        });
        await sleep(throttleMs);
        continue;
      }

      const alreadyCurrent =
        source.channel_id === resolved.channelId &&
        source.uploads_playlist_id === resolved.uploadsPlaylistId;

      if (alreadyCurrent) {
        result.unchanged += 1;
        result.details.push({ sourceName: source.source_name, status: "unchanged" });
        await sleep(throttleMs);
        continue;
      }

      const { error: updateError } = await input.supabase
        .from("sources")
        .update({
          channel_id: resolved.channelId,
          uploads_playlist_id: resolved.uploadsPlaylistId,
        })
        .eq("id", source.id);

      if (updateError) {
        result.failed += 1;
        result.details.push({
          sourceName: source.source_name,
          status: "failed",
          message: updateError.message,
        });
      } else {
        result.updated += 1;
        result.details.push({
          sourceName: source.source_name,
          status: "updated",
          message: `${source.channel_id ?? "null"} -> ${resolved.channelId}`,
        });
      }
    } catch (err) {
      result.failed += 1;
      result.details.push({
        sourceName: source.source_name,
        status: "failed",
        message: err instanceof Error ? err.message : String(err),
      });
    }

    await sleep(throttleMs);
  }

  return result;
}

export async function syncSingleSourceChannelIds(input: {
  supabase: SupabaseClient;
  sourceId: string;
  youtubeApiKey: string;
}): Promise<{ status: "updated" | "unchanged" | "failed"; message?: string; channelId?: string; uploadsPlaylistId?: string }> {
  const { data, error } = await input.supabase
    .from("sources")
    .select("id, source_name, channel_url, channel_id, uploads_playlist_id")
    .eq("id", input.sourceId)
    .eq("platform", "youtube")
    .maybeSingle();

  if (error) {
    return { status: "failed", message: error.message };
  }
  if (!data) {
    return { status: "failed", message: "Kanál nenalezen." };
  }

  const source = data as SourceChannelRow;
  const channelUrl = source.channel_url?.trim() ?? "";
  if (!channelUrl) {
    return { status: "failed", message: "Chybí channel_url." };
  }

  const resolved = await resolveChannelIdsFromChannelUrl(channelUrl, input.youtubeApiKey);
  if (!resolved) {
    return { status: "failed", message: "Nepodařilo se vyřešit channel_id z URL." };
  }

  const alreadyCurrent =
    source.channel_id === resolved.channelId && source.uploads_playlist_id === resolved.uploadsPlaylistId;

  if (alreadyCurrent) {
    return {
      status: "unchanged",
      channelId: resolved.channelId,
      uploadsPlaylistId: resolved.uploadsPlaylistId,
    };
  }

  const { error: updateError } = await input.supabase
    .from("sources")
    .update({
      channel_id: resolved.channelId,
      uploads_playlist_id: resolved.uploadsPlaylistId,
    })
    .eq("id", source.id);

  if (updateError) {
    return { status: "failed", message: updateError.message };
  }

  return {
    status: "updated",
    message: `${source.channel_id ?? "null"} -> ${resolved.channelId}`,
    channelId: resolved.channelId,
    uploadsPlaylistId: resolved.uploadsPlaylistId,
  };
}
