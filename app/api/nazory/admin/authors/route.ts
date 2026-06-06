import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireNazoryAdmin } from "@/lib/nazory/access";
import {
  createAuthorAccount,
  findUserIdByEmail,
  listAuthorsForAdmin,
  setAuthorActiveState,
} from "@/lib/nazory/authors";
import { enforceWriteRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    await requireNazoryAdmin(supabase, user);
    const authors = await listAuthorsForAdmin(supabase);
    return Response.json({ authors });
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

    const userId = await findUserIdByEmail(supabase, email);
    if (!userId) {
      return Response.json(
        { error: "Uživatel s tímto e-mailem se ještě nepřihlásil přes Google. Nejdřív se musí jednou přihlásit." },
        { status: 404 },
      );
    }

    const author = await createAuthorAccount(
      supabase,
      {
        userId,
        email,
        firstName: typeof payload.firstName === "string" ? payload.firstName : undefined,
        lastName: typeof payload.lastName === "string" ? payload.lastName : undefined,
      },
      { elevatedSupabase: createSupabaseServiceClient() },
    );

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
