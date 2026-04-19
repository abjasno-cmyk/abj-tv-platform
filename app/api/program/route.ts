export const dynamic = "force-dynamic";

const DEFAULT_PROGRAM_FEED_URL = "https://attached-assets-abjasno.replit.app/program";

function sanitizeEnvValue(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  const equalsIdx = trimmed.indexOf("=");
  const maybeAssigned =
    equalsIdx > 0 && /^[A-Z0-9_]+$/.test(trimmed.slice(0, equalsIdx))
      ? trimmed.slice(equalsIdx + 1).trim()
      : trimmed;

  if (
    (maybeAssigned.startsWith('"') && maybeAssigned.endsWith('"')) ||
    (maybeAssigned.startsWith("'") && maybeAssigned.endsWith("'"))
  ) {
    return maybeAssigned.slice(1, -1).trim();
  }
  return maybeAssigned;
}

function resolveProgramFeedUrl(): string {
  return sanitizeEnvValue(process.env.PROGRAM_FEED_URL) ?? DEFAULT_PROGRAM_FEED_URL;
}

function resolveFeedApiKey(): string | null {
  return (
    sanitizeEnvValue(process.env.FEED_API_KEY) ??
    sanitizeEnvValue(process.env.PROGRAM_FEED_API_KEY) ??
    null
  );
}

export async function GET(request: Request) {
  const apiKey = resolveFeedApiKey();
  if (!apiKey) {
    return Response.json(
      {
        error:
          "Missing FEED_API_KEY. Configure FEED_API_KEY (or PROGRAM_FEED_API_KEY) in environment variables.",
      },
      { status: 500 },
    );
  }

  const incoming = new URL(request.url);
  const upstreamUrl = new URL(resolveProgramFeedUrl());
  incoming.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.append(key, value);
  });

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      headers: {
        Accept: "application/json",
        "X-Api-Key": apiKey,
      },
      cache: "no-store",
      next: { revalidate: 0 },
    });
  } catch (error) {
    console.error("program-feed-proxy-network-error", error);
    return Response.json({ error: "Failed to fetch upstream program feed." }, { status: 502 });
  }

  const body = await upstreamResponse.text();
  return new Response(body, {
    status: upstreamResponse.status,
    headers: {
      "Content-Type": upstreamResponse.headers.get("content-type") ?? "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
