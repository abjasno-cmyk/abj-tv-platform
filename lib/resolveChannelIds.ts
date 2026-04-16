// RUN ONCE BEFORE FIRST BUILD

import { createClient } from "@supabase/supabase-js";

type SourceRow = {
  id: string;
  source_name: string;
  channel_url: string;
};

type YoutubeChannelsResponse = {
  items?: Array<{ id?: string }>;
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

function extractHandleFromChannelUrl(channelUrl: string): string | null {
  const normalized = channelUrl.trim();
  if (!normalized) {
    return null;
  }

  try {
    const parsed = new URL(normalized);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const handle = segments[segments.length - 1];
    if (!handle || !handle.startsWith("@")) {
      return null;
    }
    return handle;
  } catch {
    return null;
  }
}

async function resolveChannelIdByHandle(
  apiKey: string,
  handle: string
): Promise<string | null> {
  const handleWithoutAt = handle.startsWith("@") ? handle.slice(1) : handle;
  if (!handleWithoutAt) {
    return null;
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "id");
  url.searchParams.set("forHandle", handleWithoutAt);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`channels API failed (${response.status})`);
  }

  const data = (await response.json()) as YoutubeChannelsResponse;
  return data.items?.[0]?.id ?? null;
}

async function main() {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const youtubeApiKey = getRequiredEnv("YOUTUBE_API_KEY");

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase
    .from("sources")
    .select("id, source_name, channel_url")
    .eq("platform", "youtube")
    .is("channel_id", null)
    .order("priority", { ascending: true })
    .order("source_name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch sources: ${error.message}`);
  }

  const sources = (data ?? []) as SourceRow[];
  console.log(`Found ${sources.length} channels without channel_id`);

  for (const source of sources) {
    try {
      const handle = extractHandleFromChannelUrl(source.channel_url);
      if (!handle) {
        console.warn(`[SKIP] ${source.source_name}: invalid handle in URL`);
        await sleep(200);
        continue;
      }

      const channelId = await resolveChannelIdByHandle(youtubeApiKey, handle);
      if (!channelId) {
        console.warn(`[MISS] ${source.source_name}: channel not found for handle ${handle}`);
        await sleep(200);
        continue;
      }

      const { error: updateError } = await supabase
        .from("sources")
        .update({ channel_id: channelId })
        .eq("id", source.id);

      if (updateError) {
        console.error(`[FAIL] ${source.source_name}: ${updateError.message}`);
      } else {
        console.log(`[OK] ${source.source_name}: ${channelId}`);
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
