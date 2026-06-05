import { loadLiveChannelsForPage } from "@/lib/liveChannelsServer";

export const dynamic = "force-dynamic";

export async function GET() {
  const channels = await loadLiveChannelsForPage();
  return Response.json({ channels });
}
