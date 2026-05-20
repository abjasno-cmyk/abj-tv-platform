import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function safeNextPath(value: string | null): string {
  if (!value) return "/live";
  if (!value.startsWith("/")) return "/live";
  if (value.startsWith("//")) return "/live";
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));
  const origin = `${url.protocol}//${url.host}`;

  if (code) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.exchangeCodeForSession(code);
    } catch {
      // Non-fatal: redirect user and let client-side modal show error on demand.
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
