import { buildWallIdentityMeta } from "@/lib/wallSecurity";
import { reportWallPost, WallServiceError } from "@/lib/wallService";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

type ReportPayload = {
  reason?: string | null;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await Promise.resolve(context.params);
    const payload = (await request.json().catch(() => ({}))) as ReportPayload;
    const identity = buildWallIdentityMeta(request);
    const result = await reportWallPost(id, identity.sessionHash, payload.reason ?? null);
    return Response.json(result);
  } catch (error) {
    if (error instanceof WallServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Nahlášení se nepodařilo uložit." }, { status: 500 });
  }
}

