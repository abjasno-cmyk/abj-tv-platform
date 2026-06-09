import { requireWallAdmin } from "@/lib/wallAdminAuth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ChannelSuggestionRow = {
  id: string;
  channel_name: string;
  channel_url: string;
  reason: string;
  user_id: string | null;
  created_at: string;
};

export async function GET(request: Request) {
  const auth = requireWallAdmin(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const parsedLimit = Number.parseInt(url.searchParams.get("limit") ?? "100", 10);
  const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(300, parsedLimit)) : 100;

  try {
    const service = createSupabaseServiceClient();
    const { data, error } = await service
      .from("channel_suggestions")
      .select("id, channel_name, channel_url, reason, user_id, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("channel-suggestions-admin-list-failed", error.message);
      return Response.json({ error: "Návrhy kanálů se nepodařilo načíst." }, { status: 500 });
    }

    return Response.json({
      suggestions: (data ?? []) as ChannelSuggestionRow[],
    });
  } catch (error) {
    console.error("channel-suggestions-admin-unavailable", error);
    return Response.json({ error: "Návrhy kanálů se nepodařilo načíst." }, { status: 503 });
  }
}
