import { requireWallAdmin } from "@/lib/wallAdminAuth";
import { updateWallPostStatusByAdmin, WallServiceError } from "@/lib/wallService";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

type ActionPayload = {
  reason?: string | null;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = requireWallAdmin(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await Promise.resolve(context.params);
    const payload = (await request.json().catch(() => ({}))) as ActionPayload;
    const post = await updateWallPostStatusByAdmin({
      postId: id,
      status: "rejected",
      moderator: auth.moderator,
      reason: payload.reason ?? null,
    });
    return Response.json({ ok: true, post });
  } catch (error) {
    if (error instanceof WallServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Zamítnutí příspěvku selhalo." }, { status: 500 });
  }
}

