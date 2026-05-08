# abj-tv-platform

## ABJ Zeď (komunitní vrstva) – nutná DB migrace

Po nasazení feature branch je potřeba v Supabase spustit SQL migraci:

- `db/wall_community.sql`

Bez této migrace API vrátí hlášku, že tabulky Zdi (`wall_posts`, `wall_reactions`, `wall_reports`, `wall_moderation_log`) v DB neexistují.

Pokud už tabulky existují, ale API vrací chybu `row-level security policy`, spusť navíc:

```sql
alter table wall_posts disable row level security;
alter table wall_reactions disable row level security;
alter table wall_reports disable row level security;
alter table wall_moderation_log disable row level security;
```

## Program feed auto-import (Replit)

Program section can be automatically controlled from an external Replit feed.

### Required env variables

- `PROGRAM_FEED_URL` - full HTTPS URL to your Replit `/program` endpoint (include `:8000` when required by your deployment)
- `PROGRAM_FEED_HMAC_SECRET` - shared HMAC secret used to verify the response `x-signature` header
- `PROGRAM_FEED_API_KEY` - API key sent as request header `X-Api-Key` on every feed request

If `PROGRAM_FEED_HMAC_SECRET` is missing, importer falls back to `SESSION_SECRET`.

### Optional env variables

- `PROGRAM_FEED_STALE_ALLOWED` (`1`/`true`) - allow stale-allowed feed window (`valid_until < now <= stale_after`)
- `PROGRAM_CACHE_CRON_SECRET` (or `CRON_SECRET`) - protects both cron endpoints:
  - `/api/program/v3/refresh-cache`
  - `/api/program/v3/import-feed`

### Endpoints

- `GET /api/program/v3/import-feed` - manually trigger feed import and return import report
- `GET /api/program/v3/refresh-cache` - refresh YouTube cache and program feed import in one call
- `GET /api/program/v3/health?includeFeedImport=1` - include program feed import diagnostics

### Vercel cron schedule

- `/api/program/v3/refresh-cache` every 15 minutes
- `/api/program/v3/import-feed` every 5 minutes