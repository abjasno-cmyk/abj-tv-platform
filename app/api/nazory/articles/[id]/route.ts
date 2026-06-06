import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { isNazoryAdmin, requireAuthorWithCompletedProfile } from "@/lib/nazory/access";
import {
  getArticleById,
  getArticleByIdForAuthor,
  softDeleteArticle,
  softDeleteArticleForAuthor,
  updateArticleByAdmin,
  updateDraftArticle,
} from "@/lib/nazory/articles";
import { enforceWriteRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const { supabase, user } = await requireAuthenticatedUser();
    const admin = await isNazoryAdmin(supabase, user);
    const article = admin
      ? await getArticleById(supabase, id)
      : await (async () => {
          await requireAuthorWithCompletedProfile(supabase, user);
          return getArticleByIdForAuthor(supabase, id, user.id);
        })();
    if (!article) {
      return Response.json({ error: "Článek nebyl nalezen." }, { status: 404 });
    }
    return Response.json({ article });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Článek se nepodařilo načíst." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const limited = enforceWriteRateLimit(request, "nazory-articles");
    if (limited) return limited;

    const { id } = await context.params;
    const { supabase, user } = await requireAuthenticatedUser();
    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const patch = {
      title: typeof payload.title === "string" ? payload.title : undefined,
      perex: typeof payload.perex === "string" ? payload.perex : undefined,
      contentJson:
        payload.contentJson && typeof payload.contentJson === "object"
          ? (payload.contentJson as Record<string, unknown>)
          : undefined,
      heroImagePath:
        typeof payload.heroImagePath === "string" || payload.heroImagePath === null
          ? (payload.heroImagePath as string | null)
          : undefined,
    };

    const admin = await isNazoryAdmin(supabase, user);
    const article = admin
      ? await updateArticleByAdmin(supabase, id, patch)
      : await (async () => {
          await requireAuthorWithCompletedProfile(supabase, user);
          return updateDraftArticle(supabase, id, user.id, patch);
        })();

    return Response.json({ article });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Článek se nepodařilo uložit.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const { supabase, user } = await requireAuthenticatedUser();
    const admin = await isNazoryAdmin(supabase, user);

    const article = admin
      ? await softDeleteArticle(supabase, id)
      : await (async () => {
          await requireAuthorWithCompletedProfile(supabase, user);
          return softDeleteArticleForAuthor(supabase, id, user.id);
        })();

    return Response.json({ article });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Článek se nepodařilo odstranit.";
    return Response.json({ error: message }, { status: 500 });
  }
}
