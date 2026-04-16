// Suggested cron:
// run every 1 hour to refresh latest videos
import { createClient } from "@supabase/supabase-js";

type SourceRow = {
  id: string;
  source_name: string;
  channel_id: string;
  uploads_playlist_id: string;
};

type PlaylistItemsResponse = {
  items?: Array<{
    snippet?: {
      title?: string;
      publishedAt?: string;
      resourceId?: {
        videoId?: string;
      };
      thumbnails?: {
        medium?: { url?: string };
        high?: { url?: string };
        default?: { url?: string };
      };
    };
  }>;
};

type IngestRunStatus = "running" | "success" | "failed";

function sanitizeEnvValue(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  const equalsIdx = trimmed.indexOf("=");
  const maybeAssigned =
    equalsIdx > 0 && /^[A-Z0-9_]+$/.test(trimmed.slice(0, equalsIdx))
      ? trimmed.slice(equalsIdx + 1).trim()
      : trimmed;

  if (
    (maybeAssigned.startsWith('"') && maybeAssigned.endsWith('"')) ||
    (maybeAssigned.startsWith("'") && maybeAssigned.endsWith("'"))
  ) {
    return maybeAssigned.slice(1, -1).trim();
  }
  return maybeAssigned;
}

function requiredEnv(name: string): string {
  const value = sanitizeEnvValue(process.env[name]);
  if (!value) {
    throw new Error(`${name} not set`);
  }
  return value;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchUploadsPlaylistItems(
  uploadsPlaylistId: string,
  apiKey: string
): Promise<PlaylistItemsResponse> {
  const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("playlistId", uploadsPlaylistId);
  url.searchParams.set("maxResults", "5");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`playlistItems.list failed (${res.status})`);
  }
  return (await res.json()) as PlaylistItemsResponse;
}

async function main() {
  const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const youtubeApiKey = requiredEnv("YOUTUBE_API_KEY");
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const runStartedAt = new Date().toISOString();

  const { data: sourcesData, error: sourcesError } = await supabase
    .from("sources")
    .select("id, source_name, channel_id, uploads_playlist_id")
    .eq("platform", "youtube")
    .eq("active", true)
    .not("channel_id", "is", null)
    .not("uploads_playlist_id", "is", null)
    .order("priority", { ascending: true })
    .order("source_name", { ascending: true });

  if (sourcesError) {
    throw new Error(`Failed to load sources: ${sourcesError.message}`);
  }

  const sources = (sourcesData ?? []) as SourceRow[];
  let apiCalls = 0;
  let stored = 0;
  let runStatus: IngestRunStatus = "success";
  let runErrorText: string | null = null;

  for (const source of sources) {
    try {
      const data = await fetchUploadsPlaylistItems(source.uploads_playlist_id, youtubeApiKey);
      apiCalls += 1;

      const videos = (data.items ?? [])
        .map((item) => {
          const snippet = item.snippet;
          const videoId = snippet?.resourceId?.videoId;
          const title = snippet?.title;
          const publishedAt = snippet?.publishedAt;
          const thumbnail =
            snippet?.thumbnails?.medium?.url ??
            snippet?.thumbnails?.high?.url ??
            snippet?.thumbnails?.default?.url ??
            null;

          if (!videoId || !title || !publishedAt) {
            return null;
          }

          return {
            video_id: videoId,
            title,
            thumbnail,
            published_at: publishedAt,
            channel_id: source.channel_id,
            source_id: source.id,
            channel_name: source.source_name,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

      if (videos.length > 0) {
        const { error: upsertError } = await supabase.from("videos").upsert(videos, {
          onConflict: "video_id",
        });
        if (upsertError) {
          console.error(`[FAIL] ${source.source_name}: ${upsertError.message}`);
        } else {
          stored += videos.length;
          console.log(`[OK] ${source.source_name}: upserted ${videos.length} videos`);
        }
      } else {
        console.log(`[MISS] ${source.source_name}: no usable videos`);
      }
    } catch (err) {
      runStatus = "failed";
      runErrorText = runErrorText ?? String(err);
      console.error(`[FAIL] ${source.source_name}:`, err);
    }

    await sleep(150);
  }

  const { error: runError } = await supabase.from("ingest_runs").insert({
    started_at: runStartedAt,
    status: runStatus,
    api_calls: apiCalls,
    videos_upserted: stored,
    error_text: runErrorText,
    finished_at: new Date().toISOString(),
  });
  if (runError) {
    console.error("Failed to insert ingest_runs row:", runError.message);
  }

  console.log(`API calls made: ${apiCalls}`);
  console.log(`Videos stored: ${stored}`);
}

main().catch((err) => {
  console.error("fetchVideos failed:", err);
  process.exitCode = 1;
});
