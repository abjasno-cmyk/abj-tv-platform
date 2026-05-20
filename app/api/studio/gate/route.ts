import { NextResponse } from "next/server";

import {
  createStudioGateToken,
  getStudioGateCookieName,
  getStudioGateMaxAgeSeconds,
  validateStudioGateInput,
} from "@/lib/studio/gate";

export const dynamic = "force-dynamic";

type GatePayload = Record<string, string | undefined>;

function asString(value: string | undefined): string {
  return (value ?? "").trim();
}

function getRedirectUrl(baseUrl: string, redirectTo: string | undefined): URL {
  const url = new URL(baseUrl);
  const target = asString(redirectTo);
  if (target.startsWith("/")) {
    url.pathname = target;
    url.search = "";
  } else {
    url.pathname = "/studio";
    url.search = "";
  }
  return url;
}

async function readPayload(request: Request): Promise<GatePayload> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("application/json")) {
    const json = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(json).map(([key, value]) => [key, typeof value === "string" ? value : value == null ? undefined : String(value)]),
    );
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) return {};

  const result: GatePayload = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") result[key] = value;
  }
  return result;
}

export async function POST(request: Request) {
  const payload = await readPayload(request);
  const mode = asString(payload.mode);
  const redirectTo = asString(payload.redirect_to) || "/studio";

  const redirectUrl = getRedirectUrl(request.url, redirectTo);
  const response = NextResponse.redirect(redirectUrl);

  if (mode === "logout") {
    response.cookies.set(getStudioGateCookieName(), "", {
      path: "/",
      maxAge: 0,
      sameSite: "lax",
      httpOnly: true,
      secure: true,
    });
    redirectUrl.searchParams.set("studio_message", "Studio bylo uzamceno.");
    response.headers.set("Location", redirectUrl.toString());
    return response;
  }

  const credential = asString(payload.credential);
  const password = asString(payload.password);
  if (!validateStudioGateInput(credential, password)) {
    redirectUrl.searchParams.set("studio_login_error", "1");
    response.headers.set("Location", redirectUrl.toString());
    return response;
  }

  response.cookies.set(getStudioGateCookieName(), encodeURIComponent(createStudioGateToken()), {
    path: "/",
    maxAge: getStudioGateMaxAgeSeconds(),
    sameSite: "lax",
    httpOnly: true,
    secure: true,
  });
  redirectUrl.searchParams.set("studio_message", "Studio odemceno.");
  response.headers.set("Location", redirectUrl.toString());
  return response;
}
