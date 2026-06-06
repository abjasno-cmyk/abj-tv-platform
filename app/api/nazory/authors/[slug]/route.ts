import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPublicAuthorBySlug } from "@/lib/nazory/authors";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const supabase = await createSupabaseServerClient();
    const author = await getPublicAuthorBySlug(supabase, slug);
    if (!author) {
      return Response.json({ error: "Autor nebyl nalezen." }, { status: 404 });
    }
    return Response.json({ author });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Autora se nepodařilo načíst.";
    return Response.json({ error: message }, { status: 500 });
  }
}
