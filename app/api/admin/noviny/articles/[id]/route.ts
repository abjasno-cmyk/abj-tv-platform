import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { requireNovinyAdmin } from "@/lib/noviny/access";
import { createNovinyServiceClient, updateNovinyArticle } from "@/lib/noviny/repository";
import { enforceWriteRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

type ArticlePatchPayload = {
  editedTitle?: unknown;
  editedPerex?: unknown;
  categoryId?: unknown;
  isHidden?: unknown;
};

function parseOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const limited = enforceWriteRateLimit(request, "admin-noviny-article-update");
    if (limited) return limited;

    const { supabase, user } = await requireAuthenticatedUser();
    await requireNovinyAdmin(supabase, user);

    const { id } = await params;
    if (!id) {
      return Response.json({ error: "ID článku je povinné." }, { status: 400 });
    }

    const payload = (await request.json().catch(() => ({}))) as ArticlePatchPayload;
    const updateInput: Record<string, unknown> = {};

    const editedTitle = parseOptionalString(payload.editedTitle);
    if (editedTitle !== undefined) updateInput.edited_title = editedTitle;

    const editedPerex = parseOptionalString(payload.editedPerex);
    if (editedPerex !== undefined) updateInput.edited_perex = editedPerex;

    if (payload.categoryId !== undefined) {
      const categoryId = parseOptionalString(payload.categoryId);
      updateInput.category_id = categoryId ?? null;
    }

    if (payload.isHidden !== undefined) {
      updateInput.is_hidden = payload.isHidden === true;
    }

    if (Object.keys(updateInput).length === 0) {
      return Response.json({ error: "Není co upravit." }, { status: 400 });
    }

    const service = createNovinyServiceClient();
    const article = await updateNovinyArticle(service, id, updateInput);
    return Response.json({ article });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Článek se nepodařilo upravit.";
    return Response.json({ error: message }, { status: 500 });
  }
}
