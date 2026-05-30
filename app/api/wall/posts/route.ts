import { enforceWriteRateLimit } from "@/lib/rateLimit";
import { buildWallIdentityMeta } from "@/lib/wallSecurity";
import {
  createWallPost,
  listPublicWallPosts,
  parseWallSort,
  WallServiceError,
} from "@/lib/wallService";

export const dynamic = "force-dynamic";

type CreateWallPostPayload = {
  author_name?: string;
  author_email?: string | null;
  body?: string;
  video_id?: string | null;
  parent_id?: string | null;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const videoId = url.searchParams.get("video_id");
    const limit = Number(url.searchParams.get("limit") ?? "30");
    const offset = Number(url.searchParams.get("offset") ?? "0");
    const sort = parseWallSort(url.searchParams.get("sort") ?? "newest");
    const result = await listPublicWallPosts({
      videoId,
      limit,
      offset,
      sort,
    });
    return Response.json(result);
  } catch (error) {
    if (error instanceof WallServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Načtení Zdi selhalo." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const limited = enforceWriteRateLimit(request, "wall");
  if (limited) return limited;
  try {
    const payload = (await request.json()) as CreateWallPostPayload;
    const identity = buildWallIdentityMeta(request);
    const created = await createWallPost(
      {
        authorName: payload.author_name ?? "",
        authorEmail: payload.author_email ?? null,
        body: payload.body ?? "",
        videoId: payload.video_id ?? null,
        parentId: payload.parent_id ?? null,
      },
      identity
    );

    return Response.json({
      ok: true,
      post: created.post,
      status: created.status,
      moderation_reasons: created.moderationReasons,
    });
  } catch (error) {
    if (error instanceof WallServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Uložení vzkazu selhalo." }, { status: 500 });
  }
}

