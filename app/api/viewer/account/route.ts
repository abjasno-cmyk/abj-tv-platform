import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  ACCOUNT_DELETE_CONFIRMATION,
  assessAccountDeletion,
  deleteViewerAccount,
  getAccountDeletionContactEmail,
} from "@/lib/viewer/accountDeletion";
import { enforceWriteRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

type DeleteAccountPayload = {
  confirmation?: unknown;
};

export async function GET() {
  try {
    const { user } = await requireAuthenticatedUser();
    const service = createSupabaseServiceClient();
    const assessment = await assessAccountDeletion(service, user.id);
    return Response.json({
      allowed: assessment.allowed,
      reason: assessment.reason,
      contactEmail: assessment.contactEmail ?? getAccountDeletionContactEmail(),
      confirmationPhrase: ACCOUNT_DELETE_CONFIRMATION,
    });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Stav účtu se nepodařilo načíst." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const limited = enforceWriteRateLimit(request, "viewer-account-delete");
    if (limited) return limited;

    const { user } = await requireAuthenticatedUser();
    const payload = (await request.json().catch(() => ({}))) as DeleteAccountPayload;
    const confirmation = typeof payload.confirmation === "string" ? payload.confirmation.trim() : "";

    if (confirmation !== ACCOUNT_DELETE_CONFIRMATION) {
      return Response.json(
        {
          error: `Pro smazání účtu napište přesně ${ACCOUNT_DELETE_CONFIRMATION}.`,
          confirmationPhrase: ACCOUNT_DELETE_CONFIRMATION,
        },
        { status: 400 },
      );
    }

    await deleteViewerAccount(user.id);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Účet se nepodařilo smazat.";
    return Response.json(
      {
        error: message,
        contactEmail: getAccountDeletionContactEmail(),
      },
      { status: 400 },
    );
  }
}
