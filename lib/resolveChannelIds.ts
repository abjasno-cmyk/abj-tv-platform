// Run manually after adding new @handle sources, or rely on refreshVideoCache auto-resolve.

import { createClient } from "@supabase/supabase-js";
import { resolveChannelIdsFromChannelUrl } from "@/lib/youtubeChannelResolve";

type SourceRow = {
  id: string;
  source_name: string;
  channel_url: string;
};

function sanitizeEnvValue(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  const equalsIdx = trimmed.indexOf("=");
  const withoutInlineKeyName =
    equalsIdx > 0 && /^[A-Z0-9_]+$/.test(trimmed.slice(0, equalsIdx))
      ? trimmed.slice(equalsIdx + 1).trim()
      : trimmed;

  if (
    (withoutInlineKeyName.startsWith('"') && withoutInlineKeyName.endsWith('"')) ||
    (withoutInlineKeyName.startsWith("'") && withoutInlineKeyName.endsWith("'"))
  ) {
    return withoutInlineKeyName.slice(1, -1).trim();
  }

  return withoutInlineKeyName;
}

function getRequiredEnv(name: string): string {
  const value = sanitizeEnvValue(process.env[name]);
  if (!value) {
    throw new Error(`${name} not set`);
  }
  return value;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function main() {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey =
    sanitizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY) ??
    sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY not set");
  }
  const youtubeApiKey = getRequiredEnv("YOUTUBE_API_KEY");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase
    .from("sources")
    .select("id, source_name, channel_url")
    .eq("platform", "youtube")
    .or("channel_id.is.null,uploads_playlist_id.is.null")
    .order("priority", { ascending: true })
    .order("source_name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch sources: ${error.message}`);
  }

  const sources = (data ?? []) as SourceRow[];
  console.log(`Found ${sources.length} channels without channel_id or uploads_playlist_id`);

  for (const source of sources) {
    try {
      const resolved = await resolveChannelIdsFromChannelUrl(source.channel_url, youtubeApiKey);
      if (!resolved) {
        console.warn(`[MISS] ${source.source_name}: channel not found for URL ${source.channel_url}`);
        await sleep(200);
        continue;
      }

      const { error: updateError } = await supabase
        .from("sources")
        .update({
          channel_id: resolved.channelId,
          uploads_playlist_id: resolved.uploadsPlaylistId,
        })
        .eq("id", source.id);

      if (updateError) {
        console.error(`[FAIL] ${source.source_name}: ${updateError.message}`);
      } else {
        console.log(
          `[OK] ${source.source_name}: channel=${resolved.channelId} uploads=${resolved.uploadsPlaylistId}`
        );
      }
    } catch (err) {
      console.error(`[FAIL] ${source.source_name}:`, err);
    }

    await sleep(200);
  }
}

main().catch((err) => {
  console.error("resolveChannelIds failed:", err);
  process.exitCode = 1;
});
