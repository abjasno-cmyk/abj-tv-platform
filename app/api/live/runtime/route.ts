import { proxyReplitGet } from "@/lib/replitProxy";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return proxyReplitGet(request, "/program/now");
}
