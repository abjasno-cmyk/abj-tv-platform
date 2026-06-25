import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { requireNovinyAdmin } from "@/lib/noviny/access";
import {
  createNovinyServiceClient,
  createNovinyPublicClient,
  createNovinySource,
  listAdminNovinySources,
  listNovinyCategories,
} from "@/lib/noviny/repository";
import { normalizeExternalUrl } from "@/lib/noviny/url";
import { enforceWriteRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

type SourcePayload = {
  name?: unknown;
  rssUrl?: unknown;
  homepageUrl?: unknown;
  language?: unknown;
  country?: unknown;
  categoryId?: unknown;
  allowImages?: unknown;
  legalNote?: unknown;
};

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET() {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    await requireNovinyAdmin(supabase, user);
    const service = createNovinyServiceClient();
    const [sources, categories] = await Promise.all([
      listAdminNovinySources(service),
      listNovinyCategories(createNovinyPublicClient(), true),
    ]);
    return Response.json({ sources, categories });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Zdroje Novin se nepodařilo načíst." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const limited = enforceWriteRateLimit(request, "admin-noviny-sources");
    if (limited) return limited;

    const { supabase, user } = await requireAuthenticatedUser();
    await requireNovinyAdmin(supabase, user);
    const payload = (await request.json().catch(() => ({}))) as SourcePayload;

    const name = asTrimmedString(payload.name);
    if (!name) {
      return Response.json({ error: "Název zdroje je povinný." }, { status: 400 });
    }

    const rssUrlInput = asTrimmedString(payload.rssUrl);
    const rssUrl = rssUrlInput ? normalizeExternalUrl(rssUrlInput) : null;
    if (!rssUrl) {
      return Response.json({ error: "RSS URL je neplatná." }, { status: 400 });
    }

    const homepageInput = asTrimmedString(payload.homepageUrl);
    const homepageUrl = homepageInput ? normalizeExternalUrl(homepageInput) : null;

    const service = createNovinyServiceClient();
    const source = await createNovinySource(service, {
      name,
      rssUrl,
      homepageUrl,
      language: asTrimmedString(payload.language),
      country: asTrimmedString(payload.country),
      categoryId: asTrimmedString(payload.categoryId),
      allowImages: payload.allowImages === true,
      legalNote: asTrimmedString(payload.legalNote),
    });

    return Response.json({ source }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Zdroj se nepodařilo vytvořit.";
    return Response.json({ error: message }, { status: 500 });
  }
}
