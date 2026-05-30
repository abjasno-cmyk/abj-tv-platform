import { enforceWriteRateLimit } from "@/lib/rateLimit";
import { buildWallIdentityMeta } from "@/lib/wallSecurity";
import { addWallReaction, WallServiceError } from "@/lib/wallService";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function POST(request: Request, context: RouteContext) {
  const limited = enforceWriteRateLimit(request, "wall");
  if (limited) return limited;
  try {
    const { id } = await Promise.resolve(context.params);
    const identity = buildWallIdentityMeta(request);
    const result = await addWallReaction(id, identity.sessionHash);
    return Response.json(result);
  } catch (error) {
    if (error instanceof WallServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Reakci se nepodařilo uložit." }, { status: 500 });
  }
}

