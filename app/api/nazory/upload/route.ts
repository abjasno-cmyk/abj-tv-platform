import sharp from "sharp";

import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isNazoryAdmin, requireAuthorWithCompletedProfile } from "@/lib/nazory/access";
import { publicNazoryMediaUrl } from "@/lib/nazory/media";
import { enforceWriteRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  try {
    const limited = enforceWriteRateLimit(request, "nazory-upload");
    if (limited) return limited;

    const { supabase, user } = await requireAuthenticatedUser();
    const admin = await isNazoryAdmin(supabase, user);
    if (!admin) {
      await requireAuthorWithCompletedProfile(supabase, user);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const rawArticleId = formData.get("articleId");
    const articleId = typeof rawArticleId === "string" ? rawArticleId : null;

    if (!(file instanceof File)) {
      return Response.json({ error: "Soubor nebyl nahrán." }, { status: 400 });
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return Response.json({ error: "Povolené jsou jen obrázky JPG, PNG, WEBP nebo GIF." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ error: "Obrázek je příliš velký (max. 8 MB)." }, { status: 400 });
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const output = await sharp(inputBuffer)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const scope = articleId?.trim() || "drafts";
    const objectPath = `articles/${scope}/inline/${crypto.randomUUID()}.webp`;
    const storage = createSupabaseServiceClient().storage.from("nazory-media");
    const upload = await storage.upload(objectPath, output, {
      contentType: "image/webp",
      upsert: false,
    });

    if (upload.error) {
      return Response.json(
        {
          error:
            "Nahrání selhalo. Zkontrolujte, že je v Supabase vytvořený bucket nazory-media (viz supabase/013_nazory_storage.sql).",
        },
        { status: 500 },
      );
    }

    return Response.json({
      path: objectPath,
      publicUrl: publicNazoryMediaUrl(objectPath),
    });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Nahrání obrázku selhalo.";
    return Response.json({ error: message }, { status: 500 });
  }
}
