import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { requireNovinyAdmin } from "@/lib/noviny/access";
import {
  createNovinyPublicClient,
  createNovinyServiceClient,
  listAdminNovinyArticles,
  listNovinyCategories,
} from "@/lib/noviny/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    await requireNovinyAdmin(supabase, user);
    const service = createNovinyServiceClient();
    const [articles, categories] = await Promise.all([
      listAdminNovinyArticles(service, 300),
      listNovinyCategories(createNovinyPublicClient(), true),
    ]);
    return Response.json({ articles, categories });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Články Novin se nepodařilo načíst." }, { status: 500 });
  }
}
