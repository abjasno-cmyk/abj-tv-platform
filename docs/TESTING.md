# Testing

Test stack for `abj-tv-platform`:

| Layer | Tool | Location | Network |
|-------|------|----------|---------|
| Unit + integration | [Vitest](https://vitest.dev) | `test/unit/**`, `test/integration/**` | none (fetch mocked) |
| Live backend behavior | Vitest (opt-in) | `test/live/**` | hits real Replit backend |
| End-to-end | [Playwright](https://playwright.dev) | `tests/e2e/**` | builds & drives the app |

## Quick start

```bash
npm install            # installs vitest + playwright (devDeps)
npm test               # unit + integration (fast, no network)
npm run test:coverage  # same, with v8 coverage report in ./coverage
npm run test:watch     # watch mode

npm run e2e:install    # one-time: download the Chromium browser
npm run e2e            # build + start the app, run Playwright

npm run test:live      # opt-in: behavioral tests against the live Replit backend
```

## Layout

```
test/
  setup.ts                 # global afterEach cleanup (mocks/env/timers)
  stubs/                   # aliases for server-only / next-headers / next-cache
  unit/                    # pure-ish lib units + proxy contract tests
  live/                    # opt-in live Replit behavioral tests
tests/
  e2e/
    pages/                 # Page Object Model
    smoke.spec.ts          # public routes render without 5xx
    live.spec.ts           # /live playout page shell
    api.spec.ts            # proxy route handlers (allowlist + health)
    playback.spec.ts       # queue is populated + a video actually PLAYS (needs data)
vitest.config.ts
playwright.config.ts
```

## What is covered in this first batch

Scope was **infra + critical core**, so the highest-risk, framework-light modules
are covered first:

- `lib/rateLimit.ts` — sliding-window limiter, IP resolution, 429 headers (~93%)
- `lib/cronAuth.ts` — timing-safe Vercel Cron auth (100%)
- `lib/site.ts` — canonical host / site URL resolution (100%)
- `lib/replitProxy.ts` — path allowlist, header/API-key forwarding, 404→next-base
  fallthrough, 502 on upstream failure (~91%)
- `lib/analyticalProxy.ts` — same contract for the analytical service (~88%)
- `lib/buildPlaylist.ts` → `extractYoutubeHandle`
- `lib/programEngine.ts` → `fillGapsWithAI` (timeline invariants)

Plus Playwright smoke coverage of all public routes, the `/live` playout shell,
and the proxy route handlers end-to-end.

### Not yet covered (next iterations)

Data-access-heavy modules need a Supabase test double or seeded data and are
intentionally deferred: `api.ts`, `buildEPG.ts`, `jasne-zpravy.ts`,
`wallService.ts`, `programFeedImport.ts`, `lib/studio/*`, `fetchVideos.ts`,
`dayOverview.ts`. The proxy/live tests already exercise the Replit contract.

## How the Next.js runtime is handled in unit tests

`lib/` modules import `server-only`, `next/headers`, and `next/cache`, which only
work inside a real Next request. `vitest.config.ts` aliases each to a no-op stub
in `test/stubs/` so the modules import cleanly under Node. The stubs are only
loaded during tests — production builds use the real Next runtime.

## Live Replit tests

`test/live/replit.live.test.ts` makes real calls to the running backend and
asserts the shape, status, and latency of `/health`, `/program`, `/program/now`,
and `/feed`, plus that unknown routes return 4xx (not a 5xx crash). They are
**excluded from `npm test`** and run only via `npm run test:live`
(`RUN_REPLIT_LIVE=1`). Configure the target:

```bash
REPLIT_LIVE_URL=https://attached-assets-abjasno.replit.app \
REPLIT_API_KEY=<feed-api-key> \
npm run test:live
```

## Queue & playback E2E (needs data)

`tests/e2e/playback.spec.ts` verifies the two things that matter for the TV
experience:

1. **The queue is OK** — `GET /api/replit/program` returns a non-empty,
   chronologically-ordered `blocks[]`, each with a `video_id` and valid
   start/end; and the `/live` now-playing strip renders.
2. **A video actually plays** — the YouTube `…/embed/<id>` iframe mounts and the
   hero play/pause control flips its `aria-label` to **"Pozastavit"**, which only
   happens when the YouTube IFrame API reports the `PLAYING` state (via
   `onPlayingChange`). A `googlevideo`/`stats` request is logged as corroboration.

These need a **populated environment** (program feed + Supabase), so they are
**skipped by default** (local dev has no env). Run them against a deployment:

```bash
E2E_BASE_URL=https://abj-tv-platform-n7e8.vercel.app npm run e2e
```

or against a locally-configured server (`.env.local` with the feed + Supabase
keys) by forcing them on:

```bash
E2E_WITH_DATA=1 npm run e2e
```

Muted autoplay in headless Chromium is enabled via
`--autoplay-policy=no-user-gesture-required` in `playwright.config.ts`.

## E2E against an already-running server

By default Playwright builds and starts the app itself. To run against a server
you already have up (e.g. `npm run dev`), point it at the URL — Playwright then
skips its own web server:

```bash
E2E_BASE_URL=http://localhost:3000 npm run e2e
```

## CI

`.github/workflows/test.yml` runs on **pull requests to `main`** and pushes to
`main` (plus a daily schedule and manual dispatch). Jobs:

| Job | When | What |
|-----|------|------|
| `unit` | PR → main, push | Vitest unit/integration + coverage (hermetic) |
| `e2e-smoke` | PR → main, push | Builds the PR, Playwright smoke/shell/api (data specs auto-skip) |
| `e2e-data` | PR → main, push¹ | Builds the PR **with data**, asserts the queue is populated, a video **plays**, and selecting a queued item **swaps** the player |
| `backend-live` | PR → main, push¹ | Hits the live Replit backend: health, queue contract, **playout continuity** endpoints + auth |
| `monitor` | schedule, dispatch | Same data/playback + backend checks against **production** |

¹ Needs repo secrets, so these run for same-repo PRs and pushes (not fork PRs).

### Required secrets / variables

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon config
- `NEXT_PUBLIC_REPLIT_URL` — Replit backend base URL
- `FEED_API_KEY` — Replit program-feed API key (used as `X-Api-Key`)
- _(optional)_ repo **variable** `E2E_BASE_URL` — prod URL for the monitor job
  (defaults to `https://abj-tv-platform-n7e8.vercel.app`)

The `e2e-smoke` and `unit` jobs pass even without secrets; `e2e-data` /
`backend-live` / `monitor` need them to reach real data.

### Playout continuity

`test/live/replit.continuity.live.test.ts` verifies the nonstop-playout loop stays
healthy: `/health` reports a populated schedule for today, no stuck rebuild, quota
under limit, and program-quality telemetry; the engine endpoints `/program/now`,
`/program/fill-gap`, `/program/safety-bridge` enforce API-key auth and (with a key)
respond without a 5xx.
