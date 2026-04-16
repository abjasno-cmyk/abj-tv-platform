import { getNowPlaying, getProgram } from "@/lib/programEngine";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forcedVideoIds = (searchParams.get("forcedVideoIds") ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const forcedPriorityChannels = (searchParams.get("forcedPriorityChannels") ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  try {
    const timeline = await getProgram({ forcedVideoIds, forcedPriorityChannels });
    const nowPlaying = await getNowPlaying({ forcedVideoIds, forcedPriorityChannels });
    return Response.json({
      timezone: "Europe/Prague",
      date: new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Prague" }).format(new Date()),
      timeline,
      nowPlaying,
    });
  } catch (error) {
    console.error("program-v3-route failed", error);
    return Response.json({ error: "Program V3 unavailable" }, { status: 500 });
  }
}
