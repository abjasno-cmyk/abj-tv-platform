import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({
      savedVideoIds: [],
      watchedVideoIds: [],
      followedChannelIds: [],
    });
  }

  try {
    const { supabase: authedSupabase, user: authedUser } = await requireAuthenticatedUser();
    const [savedRes, progressRes, followsRes] = await Promise.all([
      authedSupabase.from("saved_videos").select("video_id").eq("user_id", authedUser.id),
      authedSupabase
        .from("video_progress")
        .select("video_id, completed")
        .eq("user_id", authedUser.id),
      authedSupabase.from("follows").select("channel_id").eq("user_id", authedUser.id),
    ]);

    if (savedRes.error || progressRes.error || followsRes.error) {
      return Response.json({ error: "Nepodařilo se načíst stav videí." }, { status: 500 });
    }

    return Response.json({
      savedVideoIds: (savedRes.data ?? []).map((row) => row.video_id),
      watchedVideoIds: (progressRes.data ?? [])
        .filter((row) => row.completed)
        .map((row) => row.video_id),
      followedChannelIds: (followsRes.data ?? []).map((row) => row.channel_id),
    });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Nepodařilo se načíst stav videí." }, { status: 500 });
  }
}
