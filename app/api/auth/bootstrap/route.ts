import { AuthApiError, deriveProfileFromUser, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { isNazoryAdminEmail } from "@/lib/nazory/access";
import { ensureSelfAuthorAccount } from "@/lib/nazory/authors";

export const dynamic = "force-dynamic";

type BootstrapPayload = {
  termsAccepted?: unknown;
  newsletterOptIn?: unknown;
  source?: unknown;
};

function normalizeSource(value: unknown): string {
  if (typeof value !== "string") return "login_modal";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 120) : "login_modal";
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const payload = (await request.json().catch(() => ({}))) as BootstrapPayload;
    const termsAccepted = payload.termsAccepted !== false;
    const newsletterOptIn = payload.newsletterOptIn === true;
    const source = normalizeSource(payload.source);
    const profileData = deriveProfileFromUser(user);
    const nowIso = new Date().toISOString();

    const existingProfile = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
    const isFirstAccountBootstrap = !existingProfile.data;

    if (isFirstAccountBootstrap && !termsAccepted) {
      return Response.json(
        { error: "Pro vytvoření účtu je potřeba souhlasit s podmínkami a zásadami ochrany osobních údajů." },
        { status: 400 }
      );
    }

    const profileUpsert = await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: profileData.email,
        display_name: profileData.displayName,
        avatar_url: profileData.avatarUrl,
        provider: profileData.provider,
        last_seen_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: "id" }
    );

    if (profileUpsert.error) {
      return Response.json(
        { error: "Nepodařilo se vytvořit nebo aktualizovat profil." },
        { status: 500 }
      );
    }

    if (termsAccepted) {
      const { data: termsConsentExists } = await supabase
        .from("consents")
        .select("id")
        .eq("user_id", user.id)
        .eq("consent_type", "terms_privacy")
        .eq("granted", true)
        .limit(1);
      if (!termsConsentExists || termsConsentExists.length === 0) {
        await supabase.from("consents").insert({
          user_id: user.id,
          consent_type: "terms_privacy",
          granted: true,
          source,
        });
      }
    }

    await supabase.from("consents").insert({
      user_id: user.id,
      consent_type: "newsletter",
      granted: newsletterOptIn,
      source,
    });

    await supabase.from("viewer_activity").insert({
      user_id: user.id,
      event_type: isFirstAccountBootstrap ? "account_created" : "auth_login",
      entity_type: "auth",
      entity_id: user.id,
      metadata: {
        provider: profileData.provider,
        source,
      },
    });

    if (isNazoryAdminEmail(user.email)) {
      try {
        await ensureSelfAuthorAccount(supabase, user, {
          displayName: profileData.displayName,
          avatarUrl: profileData.avatarUrl,
        });
      } catch {
        // Názory schema may be absent outside preview deployments.
      }
    }

    const profileResult = await supabase
      .from("profiles")
      .select("id, email, display_name, avatar_url, provider, role, created_at, updated_at, last_seen_at")
      .eq("id", user.id)
      .single();

    if (profileResult.error || !profileResult.data) {
      return Response.json(
        { error: "Profil byl vytvořen, ale nepodařilo se ho načíst." },
        { status: 500 }
      );
    }

    return Response.json({
      ok: true,
      created: isFirstAccountBootstrap,
      profile: profileResult.data,
    });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Inicializace účtu selhala." }, { status: 500 });
  }
}
