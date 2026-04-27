import { requireSessionUserId } from "@/lib/hybridChat/session";
import { createHybridRealtimeToken } from "@/lib/hybridChat/serverClient";

export const dynamic = "force-dynamic";

function resolveSupabaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  return raw && raw.length > 0 ? raw : null;
}

function resolvePublishableKey(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (raw && raw.length > 0) return raw;
  const fallback = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return fallback && fallback.length > 0 ? fallback : null;
}

export async function GET() {
  const userId = await requireSessionUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = resolveSupabaseUrl();
  const publishableKey = resolvePublishableKey();
  if (!supabaseUrl || !publishableKey) {
    return Response.json(
      { error: "Supabase realtime configuration is missing." },
      { status: 500 }
    );
  }

  const token = createHybridRealtimeToken(userId);

  return Response.json({
    supabaseUrl,
    publishableKey,
    userId,
    token,
  });
}
