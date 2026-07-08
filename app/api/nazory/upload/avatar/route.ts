import sharp from "sharp";

import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { requireActiveAuthor } from "@/lib/nazory/access";
import { getAuthorProfileByUserId } from "@/lib/nazory/authors";
import { publicNazoryMediaUrl } from "@/lib/nazory/media";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { enforceWriteRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  try {
    const limited = enforceWriteRateLimit(request, "nazory-avatar");
    if (limited) return limited;

    const { supabase, user } = await requireAuthenticatedUser();
    await requireActiveAuthor(supabase, user);

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Soubor nebyl nahrán." }, { status: 400 });
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return Response.json({ error: "Povolené jsou jen obrázky JPG, PNG, WEBP nebo GIF." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ error: "Obrázek je příliš velký (max. 4 MB)." }, { status: 400 });
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const output = await sharp(inputBuffer)
      .rotate()
      .resize({ width: 512, height: 512, fit: "cover" })
      .webp({ quality: 84 })
      .toBuffer();

    const objectPath = `avatars/${user.id}/${crypto.randomUUID()}.webp`;
    const storage = createSupabaseServiceClient().storage.from("nazory-media");
    const upload = await storage.upload(objectPath, output, {
      contentType: "image/webp",
      // Content-addressed (random UUID) path, never overwritten → cache for a year.
      cacheControl: "31536000",
      upsert: false,
    });

    if (upload.error) {
      return Response.json(
        {
          error:
            "Nahrání avatara selhalo. Zkontrolujte bucket nazory-media (supabase/013_nazory_storage.sql).",
        },
        { status: 500 },
      );
    }

    const { data, error } = await supabase
      .from("author_profiles")
      .update({ avatar_storage_path: objectPath })
      .eq("user_id", user.id)
      .select("avatar_storage_path")
      .single();

    if (error || !data) {
      return Response.json({ error: "Avatar se nepodařilo uložit do profilu." }, { status: 500 });
    }

    const existing = await getAuthorProfileByUserId(supabase, user.id);
    if (!existing) {
      return Response.json({ error: "Autorský profil nebyl nalezen." }, { status: 404 });
    }

    return Response.json({
      path: objectPath,
      publicUrl: publicNazoryMediaUrl(objectPath),
    });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Nahrání avatara selhalo.";
    return Response.json({ error: message }, { status: 500 });
  }
}
