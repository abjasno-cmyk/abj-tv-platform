// Run manually after adding new @handle sources, or rely on refreshVideoCache auto-resolve.
//   npm run resolve-channels           # jen chybějící ID
//   npm run resolve-channels -- --all  # všechny aktivní kanály z channel_url

import { createClient } from "@supabase/supabase-js";
import { syncSourceChannelIds } from "@/lib/syncSourceChannelIds";

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

async function main() {
  const mode = process.argv.includes("--all") ? "all" : "missing";
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

  console.log(`Syncing YouTube channel IDs (mode=${mode})...`);
  const result = await syncSourceChannelIds({
    supabase,
    youtubeApiKey,
    mode,
    throttleMs: 200,
  });

  console.log(
    `Done. scanned=${result.scanned} updated=${result.updated} unchanged=${result.unchanged} failed=${result.failed}`
  );

  for (const detail of result.details) {
    if (detail.status === "updated") {
      console.log(`[OK] ${detail.sourceName}: ${detail.message ?? "updated"}`);
    } else if (detail.status === "failed" || detail.status === "skipped") {
      console.warn(`[${detail.status.toUpperCase()}] ${detail.sourceName}: ${detail.message ?? ""}`);
    }
  }
}

main().catch((err) => {
  console.error("resolveChannelIds failed:", err);
  process.exitCode = 1;
});
