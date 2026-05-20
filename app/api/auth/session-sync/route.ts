import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SessionSyncPayload = {
  accessToken?: unknown;
  refreshToken?: unknown;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const payload = (await request.json().catch(() => ({}))) as SessionSyncPayload;
  const accessToken = asString(payload.accessToken);
  const refreshToken = asString(payload.refreshToken);
  if (!accessToken || !refreshToken) {
    return Response.json({ ok: false, error: "Missing access/refresh token." }, { status: 400 });
  }

  const setResult = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (setResult.error) {
    return Response.json({ ok: false, error: setResult.error.message }, { status: 400 });
  }

  return Response.json({ ok: true });
}

export async function DELETE() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return Response.json({ ok: true });
}
