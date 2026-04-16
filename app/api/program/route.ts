import { buildEPG } from "@/lib/buildEPG";
import { getNowPlaying, getProgram } from "@/lib/programEngine";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const v = searchParams.get("v");
  const engine = searchParams.get("engine");
  const useV3 = v === "3" || engine === "v3";

  if (useV3) {
    try {
      const forcedVideoIds = (searchParams.get("forcedVideoIds") ?? "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      const forcedPriorityChannels = (searchParams.get("forcedPriorityChannels") ?? "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

      const timeline = await getProgram({ forcedVideoIds, forcedPriorityChannels });
      const nowPlaying = await getNowPlaying({ forcedVideoIds, forcedPriorityChannels });
      return Response.json({
        timezone: "Europe/Prague",
        date: new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Prague" }).format(new Date()),
        timeline,
        nowPlaying,
      });
    } catch (error) {
      console.error(error);
      return Response.json({ error: "Program V3 unavailable" }, { status: 500 });
    }
  }

  const parsedDays = parseInt(searchParams.get("days") ?? "7", 10);
  const days = Number.isNaN(parsedDays) ? 7 : Math.min(parsedDays, 14);

  try {
    const data = await buildEPG(days);
    return Response.json(data);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "EPG unavailable" }, { status: 500 });
  }
}
