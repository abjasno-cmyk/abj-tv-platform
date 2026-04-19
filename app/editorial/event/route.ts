export const dynamic = "force-dynamic";

type EditorialEventPayload = {
  video_id?: string;
  event_type?: "expand" | "play" | "skip";
  at?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as EditorialEventPayload;
    if (!body?.video_id || !body.event_type) {
      return Response.json({ ok: false }, { status: 400 });
    }
    if (body.event_type !== "expand" && body.event_type !== "play" && body.event_type !== "skip") {
      return Response.json({ ok: false }, { status: 400 });
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
}
