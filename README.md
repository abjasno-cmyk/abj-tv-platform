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
- `/api/nazory/translate` every hour

## English mutation / veroxmed.com

První fáze anglické mutace je izolovaná jazyková vrstva pro shell webu:

- `verox.cz` zůstává český výchozí web
- `veroxmed.com` a `www.veroxmed.com` aktivují anglický locale
- `/en` a `/en/*` aktivují anglický locale jako fallback cesta
- česká data ani české routy se nemění
- EN vrstva jde vypnout přes `VEROX_EN_ENABLED=false`

Volitelné env proměnné:

- `VEROX_EN_ENABLED=false` — vypne anglickou mutaci a všude vrátí češtinu
- `VEROX_EN_HOSTS=veroxmed.com,www.veroxmed.com` — seznam domén pro EN locale
- `VEROX_EN_SITE_URL=https://www.veroxmed.com` — metadata base pro EN doménu
- `NEXT_PUBLIC_VEROX_EN_ORIGIN=https://www.veroxmed.com` — volitelný cíl EN přepínače v hlavičce; nastavujte až ve chvíli, kdy je doména nasměrovaná na deployment
- `NEXT_PUBLIC_VEROX_EN_USE_EXTERNAL_ORIGIN=true` — povolí EN přepínači používat `NEXT_PUBLIC_VEROX_EN_ORIGIN`; bez této hodnoty zůstane přepínač bezpečně na `/en/...`
- `NEXT_PUBLIC_VEROX_CS_ORIGIN=https://www.verox.cz` — cíl CZ přepínače v hlavičce

Pokud externí EN origin není explicitně povolený, EN přepínač zůstává na
aktuálním hostu a používá `/en/...`, aby nevyžadoval připravené DNS pro
`veroxmed.com`. Proxy tyto cesty interně přepíše na existující routy a zachová
EN locale v request hlavičkách. Přímé přepnutí na `veroxmed.com` zapínejte až
po dokončení DNS/deployment konfigurace nastavením `NEXT_PUBLIC_VEROX_EN_ORIGIN`
a `NEXT_PUBLIC_VEROX_EN_USE_EXTERNAL_ORIGIN=true`.

V této fázi je přeložený základní shell (metadata, hlavní navigace, footer a
CZ/EN přepínač). Obsahové překlady běží odděleně tak, aby český web nikdy
nečekal na překladové API.

Názory podporují ruční vložení originální anglické verze článku přímo v editoru.
Anglický originál se ukládá izolovaně do `opinion_articles.content_json` pod
interní klíč `veroxEnglishOriginal`, takže nevyžaduje novou Supabase migraci a
nemění českou verzi článku. V EN mutaci se použije ruční anglický titulek, perex
a tělo článku, pokud jsou vyplněné.

Názory mají také automatický EN překlad pro články bez ručního anglického
originálu. Worker ukládá výsledek do `opinion_articles.content_json` pod interní
klíč `veroxEnglishAutoTranslation`, včetně hashe českého zdroje, času vytvoření
a použitého provideru. Ruční originál má vždy přednost před automatickým
překladem. Pokud se český článek změní, hash se změní také a worker překlad
znovu vygeneruje.

- `GET /api/nazory/translate` — chráněný cron endpoint pro zpětné i průběžné
  doplňování překladů; podporuje `?limit=8` a volitelně `?force=1`
- při publikaci nebo úpravě publikovaného Názoru se překlad spustí neblokujícím
  `after()` callbackem
- s `OPENAI_API_KEY` se používá AI překlad s instrukcí zachovat tón, styl a
  argumentační duch textu; bez něj se použije jednodušší Google Translate
  fallback
- volitelné env proměnné: `VEROX_OPINION_TRANSLATION_MODEL`,
  `OPENAI_TRANSLATION_MODEL`, `VEROX_OPINION_TRANSLATION_TIMEOUT_MS`

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

V produkci se nové zprávy primárně načítají automaticky cronem
`/api/noviny/import` každých 20 minut. Stránka `/noviny` má navíc samoopravný
stale-refresh fallback: pokud poslední import vypadá zastarale, pokusí se
naplánovat bezpečný import po odeslání response. Výchozí práh je 25 minut v
preview/development a 2 hodiny v produkci. Lze řídit pomocí
`NOVINY_PAGE_STALE_IMPORT=true|false` a `NOVINY_PAGE_STALE_IMPORT_MINUTES`.

Veřejná stránka při renderu neotevírá původní články kvůli metadatům; to patří
do import/enrichment workerů, aby kliknutí na Zprávy nečekalo na externí weby.
Serverový překlad zahraničních článků má timeout `NOVINY_TRANSLATION_TIMEOUT_MS`
a limit horních položek `NOVINY_PAGE_FOREIGN_TRANSLATION_LIMIT`.

Kontext Layer 2.0 je oddělený od RSS importu. Nad publikovanými články vytváří
entity, témata, bezpečné atribuce, stručné kontextové vysvětlení a vazby na
tematické stránky. Pokud kontextová analýza selže nebo SQL 020 ještě není
nasazené, základní `/noviny` a RSS import mají dál fungovat.

Article enrichment je samostatná volitelná vrstva řízená feature flagem
`NOVINY_ENRICHMENT_ENABLED` (nastav `false` pro vypnutí). Worker respektuje
nastavení zdroje (`enrichment_enabled`, `enrichment_mode`, robots.txt, odstup
fetchů a denní limit), neukládá celý text článku a veřejně zobrazuje jen
adminem schválené pětibodové shrnutí.

### Noviny: SQL pořadí nasazení

1. `supabase/018_noviny_mvp.sql` (schéma + RLS)
2. `supabase/019_noviny_seed_sources_verified_mvp.sql` (jen ověřené funkční RSS)
3. `supabase/020_noviny_context_layer.sql` (Kontext Layer 2.0: témata, entity, vazby)
4. `supabase/021_saved_noviny_articles.sql` (uložené články Novin pro Můj Verox)
5. `supabase/022_noviny_article_enrichment.sql` (bezpečné obohacení článků a nastavení zdrojů)