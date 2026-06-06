import { AuthApiError, deriveProfileFromUser, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { isNazoryAdminEmail } from "@/lib/nazory/access";
import { ensureSelfAuthorAccount } from "@/lib/nazory/authors";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    if (!isNazoryAdminEmail(user.email)) {
      return Response.json(
        { error: "Autorský účet lze na preview aktivovat jen pro schváleného správce." },
        { status: 403 },
      );
    }

    const profileData = deriveProfileFromUser(user);
    const author = await ensureSelfAuthorAccount(supabase, user, {
      displayName: profileData.displayName,
      avatarUrl: profileData.avatarUrl,
    });

    if (!author) {
      return Response.json({ error: "Autorský účet se nepodařilo aktivovat." }, { status: 500 });
    }

    return Response.json({
      ok: true,
      author: {
        slug: author.slug,
        profileCompleted: author.profile_completed,
      },
    });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Autorský účet se nepodařilo aktivovat.";
    return Response.json({ error: message }, { status: 500 });
  }
}
