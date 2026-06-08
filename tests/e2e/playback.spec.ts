import { test, expect } from "@playwright/test";

/**
 * Queue + playback verification for the /live playout page.
 *
 * These require a POPULATED environment — a live program feed (Replit) and the
 * Supabase config — because the player only mounts when the queue produced a
 * current video. The default local dev server has no env, so these are skipped
 * unless you point E2E at a real deployment:
 *
 *   E2E_BASE_URL=https://abj-tv-platform-n7e8.vercel.app npm run e2e
 *
 * or force them on against a locally-configured server:
 *
 *   E2E_WITH_DATA=1 npm run e2e
 */
const HAS_DATA = Boolean(process.env.E2E_BASE_URL) || process.env.E2E_WITH_DATA === "1";

const PLAYABLE_BLOCK_TYPES = new Set(["live", "premiere", "recorded"]);

function readBlockType(block: Record<string, unknown>): string {
  const raw = block.type ?? block.block_type;
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

function readBlockVideoId(block: Record<string, unknown>): string | undefined {
  const raw = block.video_id ?? block.videoId;
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : undefined;
}

function readBlockStart(block: Record<string, unknown>): string | undefined {
  const raw = block.starts_at ?? block.start;
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : undefined;
}

function readBlockEnd(block: Record<string, unknown>): string | undefined {
  const raw = block.ends_at ?? block.end;
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : undefined;
}

function blockRequiresVideoId(block: Record<string, unknown>): boolean {
  const type = readBlockType(block);
  if (!type) return true;
  return PLAYABLE_BLOCK_TYPES.has(type);
}

test.describe("/live — queue & playback", () => {
  test.skip(
    !HAS_DATA,
    "Needs a populated environment. Run with E2E_BASE_URL=<deployed url> or E2E_WITH_DATA=1.",
  );

  test("the program queue is populated and well-formed", async ({ request }) => {
    const res = await request.get("/api/replit/program");
    expect(res.status(), "program feed should be reachable").toBe(200);

    const body = (await res.json()) as {
      blocks?: Array<Record<string, unknown>>;
      timeline?: Array<Record<string, unknown>>;
    };
    const blocks = body.blocks ?? body.timeline ?? [];
    expect(Array.isArray(blocks), "feed should expose a blocks/timeline array").toBe(true);
    expect(blocks.length, "the queue should not be empty").toBeGreaterThan(0);

    const playableBlocks = blocks.filter((block) => blockRequiresVideoId(block));
    expect(
      playableBlocks.length,
      "the queue should include playable blocks (live/premiere/recorded or untyped legacy blocks)",
    ).toBeGreaterThan(0);

    // Each block carries scheduling metadata; playable blocks also need a video id.
    for (const block of blocks.slice(0, 25)) {
      const videoId = readBlockVideoId(block);
      const start = readBlockStart(block);
      const end = readBlockEnd(block);
      const requiresVideoId = blockRequiresVideoId(block);

      if (requiresVideoId) {
        expect(typeof videoId, "playable blocks need a video_id").toBe("string");
        expect(videoId && videoId.length, "video_id must be non-empty").toBeTruthy();
      }

      expect(Boolean(start) && Boolean(end), "each block needs a start and end").toBe(true);
      expect(new Date(end!).getTime(), "end must be after start").toBeGreaterThan(new Date(start!).getTime());
    }

    expect(
      playableBlocks.some((block) => Boolean(readBlockVideoId(block))),
      "at least one playable block should reference a video",
    ).toBe(true);

    // The queue is chronologically ordered.
    const starts = blocks.map((b) => new Date(readBlockStart(b)!).getTime());
    expect(starts, "blocks should be ordered by start time").toEqual([...starts].sort((a, b) => a - b));
  });

  test("a video actually starts playing on /live", async ({ page }) => {
    // Ground-truth (soft): the YouTube media stream / stats ping only fires once
    // real playback begins. We don't hard-fail on it (network shape varies), but
    // log it as corroboration.
    const mediaRequest = page
      .waitForRequest(
        (r) => /googlevideo\.com\/videoplayback|youtube\.com\/(api\/stats\/(playback|watchtime)|youtubei\/v1\/player)/.test(r.url()),
        { timeout: 30_000 },
      )
      .catch(() => null);

    await page.goto("/live", { waitUntil: "domcontentloaded" });

    // 1) The playout mounted a real YouTube player (queue produced a video).
    const embed = page.locator('iframe[src*="youtube.com/embed"], iframe[src*="youtube-nocookie.com/embed"]');
    await expect(embed.first(), "YouTube player iframe should mount").toBeVisible({ timeout: 25_000 });

    const src = await embed.first().getAttribute("src");
    expect(src, "embed should reference a concrete video id").toMatch(/\/embed\/[A-Za-z0-9_-]{6,}/);

    // 2) The app surfaced the PLAYING state in the DOM. The hero play/pause
    //    button flips its aria-label to "Pozastavit" only when the YouTube
    //    IFrame API reports state PLAYING (via onPlayingChange) — i.e. the video
    //    is genuinely playing, not just embedded.
    await expect(
      page.getByRole("button", { name: "Pozastavit" }),
      "play/pause control should reflect the PLAYING state",
    ).toBeVisible({ timeout: 30_000 });

    const media = await mediaRequest;
    if (media) {
      // eslint-disable-next-line no-console
      console.log(`[playback] media/stats request observed: ${new URL(media.url()).host}`);
    }
  });

  test("the now-playing program strip renders queued items", async ({ page }) => {
    await page.goto("/live", { waitUntil: "domcontentloaded" });
    // The "playing-now" section lists upcoming/queued programmes.
    const strip = page.locator("section.playing-now");
    await expect(strip, "now-playing program strip should render").toBeVisible({ timeout: 20_000 });
    // Queue should contain at least one selectable programme tile.
    await expect(strip.locator(".playing-image button.playing-thumb-btn")).not.toHaveCount(0);
  });

  test("selecting another queued item swaps the player to that video", async ({ page }) => {
    // QUARANTINED IN CI: in linear "live" mode the YouTube embed is driven by the
    // playout loop (usePlayoutLoop), not directly by the clicked tile, so a manual
    // selection does not deterministically remount the embed in headless CI.
    // Passes locally against a deployed env. Tracked for a follow-up that asserts
    // the swap at the playout-state layer instead of the iframe src.
    test.skip(!!process.env.CI, "Quarantined in CI — playout-loop driven embed; see comment.");

    const embedSelector = 'iframe[src*="youtube.com/embed"], iframe[src*="youtube-nocookie.com/embed"]';

    // Resilient read: the YouTube component is keyed by videoId, so on a switch
    // the old iframe detaches and a new one mounts. During that gap the element
    // is briefly absent — return null instead of throwing/timing out.
    const videoIdFromSrc = async (): Promise<string | null> => {
      const el = page.locator(embedSelector).first();
      if ((await el.count()) === 0) return null;
      const src = await el.getAttribute("src", { timeout: 2_000 }).catch(() => null);
      return src?.match(/\/embed\/([A-Za-z0-9_-]{6,})/)?.[1] ?? null;
    };

    await page.goto("/live", { waitUntil: "domcontentloaded" });
    await expect(page.locator(embedSelector).first(), "player should mount").toBeVisible({ timeout: 25_000 });

    let initialId: string | null = null;
    await expect
      .poll(async () => (initialId = await videoIdFromSrc()), {
        message: "initial video id should be readable from the embed",
        timeout: 25_000,
      })
      .toBeTruthy();

    // Pick a queued tile that is not the one currently playing.
    const otherTile = page.locator("section.playing-now .playing-image:not(.is-current) button.playing-thumb-btn").first();
    await expect(otherTile, "a non-current queued tile should exist").toBeVisible({ timeout: 20_000 });
    await otherTile.click();

    // Wait until a *different, present* video id is mounted — tolerant of the
    // transient remount gap (a momentary null does not count as a swap).
    await expect
      .poll(
        async () => {
          const id = await videoIdFromSrc();
          return id && id !== initialId ? id : null;
        },
        { message: "embed should switch to a different video", timeout: 25_000 },
      )
      .toBeTruthy();
  });
});
