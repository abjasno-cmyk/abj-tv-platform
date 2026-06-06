import { NextResponse } from "next/server";

import { verifyAuthHandoffToken } from "@/lib/auth/handoff";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { handoff?: string };
    const payload = verifyAuthHandoffToken(body.handoff ?? "");
    if (!payload) {
      return NextResponse.json({ error: "Neplatný nebo expirovaný přihlašovací token." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.setSession({
      access_token: payload.accessToken,
      refresh_token: payload.refreshToken,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ redirect_to: payload.returnPath });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Handoff failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
