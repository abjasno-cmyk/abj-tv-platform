# AGENTS.md

## Cursor Cloud specific instructions

### Overview
ABJ TV Platform is a Next.js 16 (App Router) live-TV-style web app that plays curated YouTube playlists. It uses Supabase for the database and YouTube Data API v3 for video fetching.

### Running the dev server
```
npm run dev
```
Starts on port 3000. The root `/` redirects to `/live`.

### Lint & type-check
```
npm run lint      # ESLint (flat config)
npx tsc --noEmit  # TypeScript check
```

### Required environment variables
The app requires a `.env.local` file with:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key
- `YOUTUBE_API_KEY` — Google YouTube Data API v3 key

Without real credentials, the dev server still starts and renders all pages; the `/live` and `/feed` pages show graceful fallback messages instead of video content.

### Key routes
| Route | Description |
|-------|-------------|
| `/live` | TV player with auto-advancing YouTube videos + chat placeholder |
| `/feed` | Scrollable feed of video thumbnails from all tracked channels |
| `/conversations` | Static placeholder for future conversations feature |

### Database
SQL schema and seed data are in `db/schema.sql` and `db/seed_sources.sql`. These are intended for a Supabase-hosted PostgreSQL instance — there is no local DB setup in this repo.

### Gotchas
- Next.js 16 uses Turbopack by default for `next dev`. No special flags needed.
- The `eslint.config.mjs` uses flat config format (ESLint 9+).
- `package-lock.json` is present — use `npm` (not pnpm/yarn) as the package manager.
