import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireNazoryAdmin } from "@/lib/nazory/access";
import { adminUpdateAuthorProfile, getAuthorProfileByUserId } from "@/lib/nazory/authors";
import { publicNazoryMediaUrl } from "@/lib/nazory/media";
import { enforceWriteRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

function mapAuthorResponse(
  row: NonNullable<Awaited<ReturnType<typeof getAuthorProfileByUserId>>>,
  accountEmail: string | null,
) {
  return {
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    slug: row.slug,
    bio: row.bio,
    title: row.title,
    profession: row.profession,
    city: row.city,
    websiteUrl: row.website_url,
    facebookUrl: row.facebook_url,
    xUrl: row.x_url,
    linkedinUrl: row.linkedin_url,
    contactEmail: row.contact_email,
    avatarUrl: publicNazoryMediaUrl(row.avatar_storage_path),
    profileCompleted: row.profile_completed,
    isActive: row.is_active,
    accountEmail,
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await context.params;
    const { supabase, user } = await requireAuthenticatedUser();
    await requireNazoryAdmin(supabase, user);

    const author = await getAuthorProfileByUserId(supabase, userId);
    if (!author) {
      return Response.json({ error: "Autor nebyl nalezen." }, { status: 404 });
    }

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();

    return Response.json({
      author: mapAuthorResponse(author, (profileRow as { email?: string } | null)?.email ?? author.contact_email),
    });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Autora se nepodařilo načíst." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const limited = enforceWriteRateLimit(request, "nazory-admin");
    if (limited) return limited;

    const { userId } = await context.params;
    const { supabase, user } = await requireAuthenticatedUser();
    await requireNazoryAdmin(supabase, user);
    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const elevated = createSupabaseServiceClient();
    const author = await adminUpdateAuthorProfile(elevated, userId, {
      firstName: typeof payload.firstName === "string" ? payload.firstName : "",
      lastName: typeof payload.lastName === "string" ? payload.lastName : "",
      bio: typeof payload.bio === "string" ? payload.bio : null,
      title: typeof payload.title === "string" ? payload.title : null,
      profession: typeof payload.profession === "string" ? payload.profession : null,
      city: typeof payload.city === "string" ? payload.city : null,
      websiteUrl: typeof payload.websiteUrl === "string" ? payload.websiteUrl : null,
      facebookUrl: typeof payload.facebookUrl === "string" ? payload.facebookUrl : null,
      xUrl: typeof payload.xUrl === "string" ? payload.xUrl : null,
      linkedinUrl: typeof payload.linkedinUrl === "string" ? payload.linkedinUrl : null,
      contactEmail: typeof payload.contactEmail === "string" ? payload.contactEmail : null,
      avatarStoragePath:
        typeof payload.avatarStoragePath === "string" ? payload.avatarStoragePath : undefined,
      profileCompleted: payload.profileCompleted === true,
    });

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();

    return Response.json({
      author: mapAuthorResponse(author, (profileRow as { email?: string } | null)?.email ?? author.contact_email),
    });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Profil autora se nepodařilo uložit.";
    return Response.json({ error: message }, { status: 500 });
  }
}
