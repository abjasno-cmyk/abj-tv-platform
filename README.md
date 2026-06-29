# abj-tv-platform

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

### Manual schedule without `video_id` (title-based resolution)

Program engine now supports manual slots where `video_id` is omitted, as long as
the block has `title` and valid time window. In that mode:

- importer stores the slot with `title` + `time` metadata
- engine attempts to resolve the real YouTube `videoId` from cached candidates by title
- if no match is found, the slot is still kept in the timeline (as non-playable)

### Vercel cron schedule

- `/api/program/v3/refresh-cache` every 15 minutes
- `/api/program/v3/import-feed` every 5 minutes
- `/api/noviny/import` every 20 minutes
- `/api/noviny/enrich` every 15 minutes
- `/api/noviny/context/analyze` every hour
- `/api/search/index` every hour

## Noviny (MVP)

Sekce Noviny je oddělená od živého vysílání/programu a používá vlastní tabulky
`noviny_*` + vlastní API:

- `GET /api/noviny/import` — cron import veřejných RSS zdrojů
- `GET /api/noviny/enrich` — bezpečný article enrichment worker (feature flag `NOVINY_ENRICHMENT_ENABLED`)
- `GET /api/noviny/context/analyze` — izolovaná kontextová analýza článků
- `/api/viewer/saved-noviny` — osobní ukládání článků Novin do Můj Verox
- `/admin/noviny` — dashboard
- `/admin/noviny/zdroje` — správa RSS zdrojů (přidat/vypnout/ruční refresh)
- `/admin/noviny/clanky` — úprava metadata článků (titulek, perex, kategorie, skrytí)
- `/noviny/tema/[slug]` — veřejné tematické stránky Kontextu 2.0

Import pracuje pouze s metadaty článku (titulek, perex, URL, zdroj, datum) a
deduplikuje podle canonical URL.

V produkci se nové zprávy načítají automaticky cronem `/api/noviny/import`
každých 20 minut. V preview/development prostředí se stránka `/noviny` navíc
pokusí spustit bezpečný stale-refresh, pokud poslední import vypadá starší než
25 minut. Lze řídit pomocí `NOVINY_PAGE_STALE_IMPORT=true|false`.

Kontext Layer 2.0 je oddělený od RSS importu. Nad publikovanými články vytváří
entity, témata, bezpečné atribuce, stručné kontextové vysvětlení a vazby na
tematické stránky. Pokud kontextová analýza selže nebo SQL 020 ještě není
nasazené, základní `/noviny` a RSS import mají dál fungovat.

Article enrichment je samostatná volitelná vrstva řízená feature flagem
`NOVINY_ENRICHMENT_ENABLED` (nastav `false` pro vypnutí). Worker respektuje
nastavení zdroje (`enrichment_enabled`, `enrichment_mode`, robots.txt, odstup
fetchů a denní limit), neukládá celý text článku a veřejně zobrazuje jen
adminem schválené pětibodové shrnutí.

## Sjednocené vyhledávání

Vyhledávání je izolovaná vrstva nad veřejně použitelnými pasážemi z videí,
přepisů, Zpráv a Názorů. Používá samostatnou tabulku `verox_search_documents`,
Postgres full-text search, trigramovou toleranci překlepů (`pg_trgm`) a sloupec
`embedding vector(1536)` připravený pro semantické řazení přes `pgvector`.

- `GET /api/search?q=...` — veřejný hybridní dotaz
- `GET /api/search/index` — cron/manual reindex chráněný `CRON_SECRET`
- `/vyhledavani` — veřejná stránka sjednoceného vyhledávání

Pokud je nastavený `OPENAI_API_KEY`, indexer doplňuje embeddingy a dotaz může
využít semantickou složku. Bez klíče vyhledávání dál funguje přes FTS + fuzzy.
AI souhrn se generuje jen z nalezených úryvků výsledků a vrací odkazy na použité
zdroje. Search index neukládá celý interně vytěžený text externích Zpráv; u
Zpráv používá RSS metadata a případné adminem schválené enrichment shrnutí.

### Noviny: SQL pořadí nasazení

1. `supabase/018_noviny_mvp.sql` (schéma + RLS)
2. `supabase/019_noviny_seed_sources_verified_mvp.sql` (jen ověřené funkční RSS)
3. `supabase/020_noviny_context_layer.sql` (Kontext Layer 2.0: témata, entity, vazby)
4. `supabase/021_saved_noviny_articles.sql` (uložené články Novin pro Můj Verox)
5. `supabase/022_noviny_article_enrichment.sql` (bezpečné obohacení článků a nastavení zdrojů)
6. `supabase/023_unified_search_layer.sql` (sjednocený hybridní search index)