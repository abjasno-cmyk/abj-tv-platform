import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { requireNovinyAdmin } from "@/lib/noviny/access";
import { createNovinyServiceClient, updateNovinySource } from "@/lib/noviny/repository";
import { normalizeExternalUrl } from "@/lib/noviny/url";
import { enforceWriteRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

type UpdatePayload = {
  name?: unknown;
  rssUrl?: unknown;
  homepageUrl?: unknown;
  language?: unknown;
  country?: unknown;
  categoryId?: unknown;
  allowImages?: unknown;
  legalNote?: unknown;
  isActive?: unknown;
};

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const limited = enforceWriteRateLimit(request, "admin-noviny-source-update");
    if (limited) return limited;

    const { id } = await params;
    if (!id) {
      return Response.json({ error: "ID zdroje je povinné." }, { status: 400 });
    }

    const { supabase, user } = await requireAuthenticatedUser();
    await requireNovinyAdmin(supabase, user);

    const payload = (await request.json().catch(() => ({}))) as UpdatePayload;

    const updateInput: Record<string, unknown> = {};
    const name = asTrimmedString(payload.name);
    if (name) updateInput.name = name;

    const rssUrlInput = asTrimmedString(payload.rssUrl);
    if (rssUrlInput !== null) {
      const normalized = normalizeExternalUrl(rssUrlInput);
      if (!normalized) {
        return Response.json({ error: "RSS URL je neplatná." }, { status: 400 });
      }
      updateInput.rss_url = normalized;
    }

    const homepageInput = asTrimmedString(payload.homepageUrl);
    if (payload.homepageUrl !== undefined) {
      updateInput.homepage_url = homepageInput ? normalizeExternalUrl(homepageInput) : null;
    }

    if (payload.language !== undefined) updateInput.language = asTrimmedString(payload.language);
    if (payload.country !== undefined) updateInput.country = asTrimmedString(payload.country);
    if (payload.categoryId !== undefined) updateInput.category_id = asTrimmedString(payload.categoryId);
    if (payload.allowImages !== undefined) updateInput.allow_images = payload.allowImages === true;
    if (payload.legalNote !== undefined) updateInput.legal_note = asTrimmedString(payload.legalNote);
    if (payload.isActive !== undefined) updateInput.is_active = payload.isActive === true;

    if (Object.keys(updateInput).length === 0) {
      return Response.json({ error: "Není co upravit." }, { status: 400 });
    }

    const service = createNovinyServiceClient();
    const source = await updateNovinySource(service, id, updateInput);
    return Response.json({ source });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Zdroj se nepodařilo upravit.";
    return Response.json({ error: message }, { status: 500 });
  }
}
