# AGENTS.md

## Cursor Cloud specific instructions

### Overview

ABJ TV Platform is a Czech live TV platform built on Next.js 16 (App Router, React 19) that aggregates YouTube content via Supabase and the YouTube Data API v3. The UI language is Czech.

### Required environment variables

Create a `.env.local` in the project root with:

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key
- `YOUTUBE_API_KEY` — YouTube Data API v3 key (server-side only)

Without real credentials the app still starts; `/live` and `/feed` show graceful empty-state messages, and `/conversations` renders its placeholder.

### Commands

Standard scripts are in `package.json`:

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Lint | `npm run lint` (ESLint, flat config) |
| Build | `npm run build` |
| Production server | `npm run start` |

### Gotchas

- The `/live` and `/feed` pages use `export const dynamic = "force-dynamic"` so they always server-render. Build will succeed even with placeholder env vars, but those pages will log errors to the console at request time.
- The Supabase client helpers in `lib/supabase/server.ts` include a `sanitizeEnvValue` function that strips wrapping quotes and inline `KEY=value` prefixes from env var values. Be careful with env var formatting.
- No automated test suite exists in this repository. Validation is done via lint + build + manual browser testing.
- The package manager is **npm** (lockfile: `package-lock.json`).
