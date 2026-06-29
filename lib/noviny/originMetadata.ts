import "server-only";

import { decodeHtmlEntities, normalizeWhitespace, stripHtmlToText } from "@/lib/noviny/text";

type OriginMetadata = {
  title: string | null;
  description: string | null;
  author: string | null;
  sourceText: string | null;
};

const ROBOTS_CACHE = new Map<string, string>();
const ORIGIN_METADATA_CACHE = new Map<string, OriginMetadata | null>();

function stripScriptsAndStyles(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ");
}

function pickMeta(html: string, names: string[]): string | null {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${escaped}["'][^>]*>`, "i"),
    ];
    for (const pattern of patterns) {
      const match = pattern.exec(html);
      if (match?.[1]) return normalizeWhitespace(decodeHtmlEntities(match[1]));
    }
  }
  return null;
}

function pickTitle(html: string): string | null {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (!match?.[1]) return null;
  return normalizeWhitespace(decodeHtmlEntities(stripHtmlToText(match[1])));
}

function pickJsonLdSourceText(html: string): string | null {
  const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) ?? [];
  for (const script of scripts) {
    const contentMatch = />\s*([\s\S]*?)\s*<\/script>/i.exec(script);
    const content = contentMatch?.[1]?.trim();
    if (!content) continue;
    try {
      const parsed = JSON.parse(content) as unknown;
      const nodes = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === "object" && Array.isArray((parsed as Record<string, unknown>)["@graph"])
          ? ((parsed as Record<string, unknown>)["@graph"] as unknown[])
          : [parsed];

      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        const record = node as Record<string, unknown>;
        const type = String(record["@type"] ?? "").toLowerCase();
        if (type.includes("article") || type.includes("newsarticle")) {
          const articleBody = typeof record.articleBody === "string" ? record.articleBody : null;
          const description = typeof record.description === "string" ? record.description : null;
          const source = articleBody ?? description;
          if (source) {
            const cleaned = normalizeWhitespace(stripHtmlToText(source));
            if (cleaned.length >= 120) return cleaned.slice(0, 7000);
          }
        }
      }
    } catch {
      // ignore invalid json-ld blocks
    }
  }
  return null;
}

function parseRobotsRules(content: string): Array<{ agents: string[]; disallow: string[] }> {
  const lines = content.split(/\r?\n/).map((line) => line.trim());
  const groups: Array<{ agents: string[]; disallow: string[] }> = [];
  let current: { agents: string[]; disallow: string[] } | null = null;

  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (key === "user-agent") {
      if (!current || current.disallow.length > 0) {
        current = { agents: [], disallow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      continue;
    }
    if (key === "disallow" && current) {
      current.disallow.push(value);
    }
  }

  return groups;
}

async function isPathAllowedByRobots(url: URL): Promise<boolean> {
  const host = url.host.toLowerCase();
  if (ROBOTS_CACHE.has(host)) {
    const robots = ROBOTS_CACHE.get(host) ?? "";
    return checkRobotsForPath(robots, url.pathname);
  }

  try {
    const robotsUrl = `${url.protocol}//${url.host}/robots.txt`;
    const response = await fetch(robotsUrl, {
      method: "GET",
      cache: "force-cache",
      headers: {
        "User-Agent": "VeroxNovinyBot/1.0 (+https://www.verox.cz)",
      },
    });
    if (!response.ok) {
      ROBOTS_CACHE.set(host, "");
      return true;
    }
    const text = await response.text();
    ROBOTS_CACHE.set(host, text);
    return checkRobotsForPath(text, url.pathname);
  } catch {
    ROBOTS_CACHE.set(host, "");
    return true;
  }
}

function checkRobotsForPath(robotsText: string, path: string): boolean {
  if (!robotsText.trim()) return true;
  const groups = parseRobotsRules(robotsText);
  const applicable = groups.filter((group) => group.agents.some((agent) => agent === "*" || agent.includes("verox")));
  if (applicable.length === 0) return true;

  for (const group of applicable) {
    for (const disallow of group.disallow) {
      const rule = disallow.trim();
      if (!rule) continue;
      if (rule === "/") return false;
      if (path.startsWith(rule)) return false;
    }
  }
  return true;
}

export async function fetchOriginMetadata(originalUrl: string): Promise<OriginMetadata | null> {
  const url = originalUrl.trim();
  if (!url) return null;
  if (ORIGIN_METADATA_CACHE.has(url)) return ORIGIN_METADATA_CACHE.get(url) ?? null;

  try {
    const parsedUrl = new URL(url);
    const allowed = await isPathAllowedByRobots(parsedUrl);
    if (!allowed) {
      ORIGIN_METADATA_CACHE.set(url, null);
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(url, {
        method: "GET",
        cache: "force-cache",
        headers: {
          "User-Agent": "VeroxNovinyBot/1.0 (+https://www.verox.cz)",
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        },
        signal: controller.signal,
      });
      if (!response.ok) {
        ORIGIN_METADATA_CACHE.set(url, null);
        return null;
      }
      const htmlRaw = await response.text();
      const html = stripScriptsAndStyles(htmlRaw);
      const title = pickMeta(html, ["og:title", "twitter:title"]) ?? pickTitle(html);
      const description = pickMeta(html, ["og:description", "twitter:description", "description"]);
      const author = pickMeta(html, ["author", "article:author", "parsely-author"]);
      const sourceText = pickJsonLdSourceText(html) ?? description;

      const metadata: OriginMetadata = {
        title: title ? title.slice(0, 400) : null,
        description: description ? description.slice(0, 1400) : null,
        author: author ? author.slice(0, 240) : null,
        sourceText: sourceText ? sourceText.slice(0, 7000) : null,
      };
      ORIGIN_METADATA_CACHE.set(url, metadata);
      return metadata;
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    ORIGIN_METADATA_CACHE.set(url, null);
    return null;
  }
}
