import { buildEPG } from "@/lib/buildEPG";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
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
