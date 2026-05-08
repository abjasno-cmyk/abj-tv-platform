import { requireWallAdmin } from "@/lib/wallAdminAuth";
import { listAdminWallPosts, parseWallStatus, WallServiceError } from "@/lib/wallService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = requireWallAdmin(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const url = new URL(request.url);
    const status = parseWallStatus(url.searchParams.get("status") ?? undefined);
    const limit = Number(url.searchParams.get("limit") ?? "80");
    const offset = Number(url.searchParams.get("offset") ?? "0");
    const result = await listAdminWallPosts({ status: status ?? undefined, limit, offset });
    return Response.json(result);
  } catch (error) {
    if (error instanceof WallServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Admin výpis Zdi selhal." }, { status: 500 });
  }
}

