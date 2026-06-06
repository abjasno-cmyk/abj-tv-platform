import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { getAuthorProfileByUserId, upsertAuthorProfile } from "@/lib/nazory/authors";
import { requireActiveAuthor } from "@/lib/nazory/access";
import { publicNazoryMediaUrl } from "@/lib/nazory/media";

export const dynamic = "force-dynamic";

function mapProfileResponse(row: NonNullable<Awaited<ReturnType<typeof getAuthorProfileByUserId>>>) {
  return {
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
  };
}

export async function GET() {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    await requireActiveAuthor(supabase, user);
    const profile = await getAuthorProfileByUserId(supabase, user.id);
    if (!profile) {
      return Response.json({ error: "Autorský profil nebyl nalezen." }, { status: 404 });
    }
    return Response.json({ profile: mapProfileResponse(profile) });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Profil se nepodařilo načíst.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    await requireActiveAuthor(supabase, user);
    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const profile = await upsertAuthorProfile(supabase, user.id, {
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
    });
    return Response.json({ profile: mapProfileResponse(profile) });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Profil se nepodařilo uložit.";
    return Response.json({ error: message }, { status: 500 });
  }
}
