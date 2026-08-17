import { revalidatePath } from "next/cache";

import { isCronAuthorized } from "@/lib/cronAuth";
import { runOpinionAutoTranslation } from "@/lib/nazory/autoTranslation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const rawLimit = url.searchParams.get("limit");
  const limit = rawLimit ? Number(rawLimit) : undefined;
  const force = url.searchParams.get("force") === "1" || url.searchParams.get("force") === "true";

  try {
    const report = await runOpinionAutoTranslation({ limit, force });
    if (report.translated > 0) {
      revalidatePath("/nazory");
      revalidatePath("/en/nazory");
    }

    return Response.json(
      {
        ok: report.failed === 0,
        report,
      },
      { status: report.failed === 0 ? 200 : 207 },
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Automatický překlad Názorů selhal.",
      },
      { status: 500 },
    );
  }
}
