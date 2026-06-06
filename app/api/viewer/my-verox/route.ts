import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { loadMyVeroxLibraryForUser } from "@/lib/viewer/myVeroxLibrary";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const library = await loadMyVeroxLibraryForUser(supabase, user.id);
    return Response.json({ library });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Nepodařilo se načíst Můj Verox.";
    return Response.json({ error: message }, { status: 500 });
  }
}
