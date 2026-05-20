import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";

export const dynamic = "force-dynamic";

type FollowPayload = {
  channelId?: unknown;
};

function normalizeChannelId(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 200) : "";
}

export async function GET() {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const follows = await supabase
      .from("follows")
      .select("channel_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (follows.error) {
      return Response.json({ error: "Nepodařilo se načíst oblíbené kanály.", details: follows.error.message }, { status: 500 });
    }

    return Response.json({
      follows: (follows.data ?? []).map((row) => ({
        channelId: row.channel_id,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Nepodařilo se načíst oblíbené kanály." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const payload = (await request.json().catch(() => ({}))) as FollowPayload;
    const channelId = normalizeChannelId(payload.channelId);
    if (!channelId) {
      return Response.json({ error: "channelId je povinné." }, { status: 400 });
    }

    const insert = await supabase.from("follows").insert({
      user_id: user.id,
      channel_id: channelId,
    });
    if (insert.error && insert.error.code !== "23505") {
      return Response.json({ error: "Uložení oblíbeného kanálu selhalo.", details: insert.error.message }, { status: 500 });
    }

    await supabase.from("viewer_activity").insert({
      user_id: user.id,
      event_type: "channel_followed",
      entity_type: "channel",
      entity_id: channelId,
      metadata: {},
    });

    return Response.json({ ok: true, followed: true });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Uložení oblíbeného kanálu selhalo." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const url = new URL(request.url);
    const channelId = normalizeChannelId(url.searchParams.get("channelId"));
    if (!channelId) {
      return Response.json({ error: "channelId je povinné." }, { status: 400 });
    }

    const remove = await supabase.from("follows").delete().eq("user_id", user.id).eq("channel_id", channelId);
    if (remove.error) {
      return Response.json({ error: "Odebrání kanálu selhalo.", details: remove.error.message }, { status: 500 });
    }

    await supabase.from("viewer_activity").insert({
      user_id: user.id,
      event_type: "channel_unfollowed",
      entity_type: "channel",
      entity_id: channelId,
      metadata: {},
    });

    return Response.json({ ok: true, followed: false });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Odebrání kanálu selhalo." }, { status: 500 });
  }
}
