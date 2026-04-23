import { proxyAnalyticalGet, proxyAnalyticalPost } from "@/lib/analyticalProxy";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ path?: string[] }> | { path?: string[] };
};

async function resolveUpstreamPath(context: RouteContext): Promise<string> {
  const resolved = await Promise.resolve(context.params);
  const segments = Array.isArray(resolved.path) ? resolved.path : [];
  if (segments.length === 0) return "/";
  return `/${segments.map((segment) => encodeURIComponent(segment)).join("/")}`;
}

export async function GET(request: Request, context: RouteContext) {
  const upstreamPath = await resolveUpstreamPath(context);
  return proxyAnalyticalGet(request, upstreamPath);
}

export async function POST(request: Request, context: RouteContext) {
  const upstreamPath = await resolveUpstreamPath(context);
  return proxyAnalyticalPost(request, upstreamPath);
}
