export const dynamic = "force-dynamic";

type InteractionPayload = {
  event: "impression" | "click";
  video_id?: string;
  source?: string;
  at?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as InteractionPayload;
    if (!body || (body.event !== "impression" && body.event !== "click")) {
      return Response.json({ ok: false }, { status: 400 });
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
}
