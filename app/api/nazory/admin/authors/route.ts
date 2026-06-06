import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireNazoryAdmin } from "@/lib/nazory/access";
import {
  adminUpdateAuthorProfile,
  createAuthorAccount,
  listAuthorsForAdmin,
  setAuthorActiveState,
} from "@/lib/nazory/authors";
import { provisionUserByEmail } from "@/lib/nazory/provision";
import { enforceWriteRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    await requireNazoryAdmin(supabase, user);
    const authors = await listAuthorsForAdmin(supabase);
    const userIds = authors.map((author) => author.user_id);
    const emailByUserId = new Map<string, string | null>();

    if (userIds.length > 0) {
      const { data: profileRows } = await supabase.from("profiles").select("id, email").in("id", userIds);
      for (const row of (profileRows ?? []) as Array<{ id: string; email: string | null }>) {
        emailByUserId.set(row.id, row.email);
      }
    }

    return Response.json({
      authors: authors.map((author) => ({
        ...author,
        account_email: emailByUserId.get(author.user_id) ?? author.contact_email,
      })),
    });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Autory se nepodařilo načíst." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const limited = enforceWriteRateLimit(request, "nazory-admin");
    if (limited) return limited;

    const { supabase, user } = await requireAuthenticatedUser();
    await requireNazoryAdmin(supabase, user);
    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    if (!email) {
      return Response.json({ error: "E-mail autora je povinný." }, { status: 400 });
    }

    const userId = await provisionUserByEmail(email);
    const elevated = createSupabaseServiceClient();
    const profileCompleted = payload.profileCompleted === true;

    let author = await createAuthorAccount(
      supabase,
      {
        userId,
        email,
        firstName: typeof payload.firstName === "string" ? payload.firstName : undefined,
        lastName: typeof payload.lastName === "string" ? payload.lastName : undefined,
        profileCompleted,
      },
      { elevatedSupabase: elevated },
    );

    const hasProfileFields =
      typeof payload.firstName === "string" ||
      typeof payload.lastName === "string" ||
      typeof payload.bio === "string" ||
      typeof payload.title === "string";

    if (hasProfileFields) {
      author = await adminUpdateAuthorProfile(elevated, userId, {
        firstName: typeof payload.firstName === "string" ? payload.firstName : author.first_name,
        lastName: typeof payload.lastName === "string" ? payload.lastName : author.last_name,
        bio: typeof payload.bio === "string" ? payload.bio : author.bio,
        title: typeof payload.title === "string" ? payload.title : author.title,
        profession: typeof payload.profession === "string" ? payload.profession : author.profession,
        city: typeof payload.city === "string" ? payload.city : author.city,
        websiteUrl: typeof payload.websiteUrl === "string" ? payload.websiteUrl : author.website_url,
        facebookUrl: typeof payload.facebookUrl === "string" ? payload.facebookUrl : author.facebook_url,
        xUrl: typeof payload.xUrl === "string" ? payload.xUrl : author.x_url,
        linkedinUrl: typeof payload.linkedinUrl === "string" ? payload.linkedinUrl : author.linkedin_url,
        contactEmail: email,
        profileCompleted,
      });
    }

    return Response.json({ author });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Autora se nepodařilo přidat.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    await requireNazoryAdmin(supabase, user);
    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const userId = typeof payload.userId === "string" ? payload.userId : "";
    if (!userId) {
      return Response.json({ error: "userId je povinné." }, { status: 400 });
    }
    const author = await setAuthorActiveState(supabase, userId, payload.isActive !== false);
    return Response.json({ author });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Stav autora se nepodařilo změnit.";
    return Response.json({ error: message }, { status: 500 });
  }
}
