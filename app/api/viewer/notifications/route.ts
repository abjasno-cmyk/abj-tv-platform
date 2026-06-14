import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import {
  loadMyVeroxEngagementForUser,
  markNotificationsRead,
} from "@/lib/viewer/commentEngagement";

export const dynamic = "force-dynamic";

type MarkReadPayload = {
  notificationIds?: unknown;
  markAll?: unknown;
};

function normalizeIds(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const ids = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  return ids.length > 0 ? ids : undefined;
}

export async function GET() {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const engagement = await loadMyVeroxEngagementForUser(supabase, user.id);
    return Response.json({
      unreadCount: engagement.unreadCount,
      notifications: engagement.notifications,
      recentComments: engagement.recentComments,
    });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Nepodařilo se načíst upozornění." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const payload = (await request.json().catch(() => ({}))) as MarkReadPayload;
    const notificationIds = normalizeIds(payload.notificationIds);
    const markAll = payload.markAll === true;

    const marked = await markNotificationsRead(
      supabase,
      user.id,
      markAll ? undefined : notificationIds,
    );

    return Response.json({ ok: true, marked });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Označení jako přečtené se nezdařilo." }, { status: 500 });
  }
}
