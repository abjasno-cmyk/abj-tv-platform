# abj-tv-platform

Tento dokument je pripraveny jako technicky a bezpecnostni prehled integraci
pro sekci Program (V3), hlavne pro spolupraci s kolegou na security review.

## 1) Co je ted zapojeno (high-level)

Aktualni system ma 4 hlavni datove zdroje/sluzby:

1. **Replit** (externi feedy):
   - `/program` (Program Feed Contract v1)
   - dalsi endpointy pres proxy `/api/replit/*` (napr. `/program`, `/feed`, `/health`)
2. **YouTube Data API v3** (ingest videi do cache)
3. **Supabase** (tabulky `sources`, `videos`, `ingest_runs`, dalsi app data)
4. **Next.js aplikace na Vercel** (UI + API vrstvy + cron endpointy)

Zjednoduseny tok:

```text
Replit /program --(X-Api-Key + x-signature)--> import validator (Next.js)
                 --> manualSchedule (cache) --> Program Engine V3 --> /live + /program UI

YouTube API --> refreshVideoCache --> Supabase.videos --> Program Engine V3

Vercel cron --> /api/program/v3/import-feed (5m)
            --> /api/program/v3/refresh-cache (15m)
```

## 2) Segmenty a jejich role

### A) Replit feed import (bezpecnostnejsi cesta)

Klicovy modul: `lib/programFeedImport.ts`

- Nacita feed z `PROGRAM_FEED_URL`
- Posila `X-Api-Key` header (hodnota z env, viz seznam nize)
- Validuje `x-signature: v1=<hex>` pres HMAC-SHA256
- Kontroluje schema, casova okna a timezone
- Transformuje `blocks[]` -> `manualSchedule[]` pro Program Engine
- Cache:
  - `unstable_cache`, revalidate 300 s
  - tag: `program-feed-import`

Poznamka: importovana data se aktualne **neukladaji trvale** do DB; drzi se
v runtime cache a pouzivaji se pri stavbe timeline.

### B) Program Engine V3

Klicovy modul: `lib/programEngine.ts`

Sklada timeline z vice vrstev:

1. ceremonial + fixed ABJ bloky
2. manual schedule (z Replit importu + lokalni overrides)
3. forced rules
4. live/premiere bloky z cached videi
5. deterministicke doplneni mezer (coming_up / recorded fallback)

Pouziva:
- `getProgramFeedImport()` (Replit import)
- Supabase `videos` cache (nebo fallback)

### C) YouTube ingest pipeline

Klicovy modul: `lib/fetchVideos.ts`

- Cita aktivni youtube source z `sources`
- Vola quota-safe:
  - `playlistItems.list` (video IDs)
  - `videos.list` (detaily batch)
- Uklada/upsertuje do `videos`
- Loguje ingest do `ingest_runs`
- Obsahuje auto-heal pro neplatne `uploads_playlist_id` (404)

### D) Frontend + API proxy vrstva

1. `app/live/page.tsx`
   - primarne zkousi external timeline z Replit feedu (`X-Api-Key`)
   - fallback na interni V3 engine
2. `app/program/page.tsx`
   - pouziva `useProgram()` -> `fetchProgram()` -> `/api/replit/program`
3. `/api/replit/[...path]`
   - genericka GET/POST proxy na Replit
4. `/api/program`
   - dedikovana proxy na `/program` feed (bez HMAC validace, pass-through)

## 3) Endpointy (co dela ktery)

### Program V3 operational endpointy

- `GET /api/program/v3/import-feed`
  - manual trigger importu Replit feedu
  - pri uspechu dela `revalidateTag(program-feed-import)` a `program-engine-v3`
- `GET /api/program/v3/refresh-cache`
  - triggerne:
    1) feed import
    2) YouTube cache refresh
    3) zapis ingest logu
- `GET /api/program/v3/health?includeFeedImport=1`
  - health report (timeline/cache/ingest)
  - volitelne:
    - `probe=1` (YouTube API probe)
    - `liveSmoke=1`

### Proxy endpointy na Replit

- `GET|POST /api/replit/[...path]`
  - forwarduje request na Replit base URL
  - prida `X-Api-Key` (pokud je dostupny)
- `GET /api/program`
  - proxy na Replit `/program` feed (kandidati URL + fallback)

## 4) Autorizace, tajemstvi, podpisy

### Replit feed tajemstvi

Povinne:
- `PROGRAM_FEED_URL`
- `PROGRAM_FEED_API_KEY` (resp. aliasy nize)
- `PROGRAM_FEED_HMAC_SECRET` (fallback: `SESSION_SECRET`)

Volitelne:
- `PROGRAM_FEED_STALE_ALLOWED=true|1`

### Cron ochrana

- `PROGRAM_CACHE_CRON_SECRET` (fallback `CRON_SECRET`)
- pouziva se pro:
  - `/api/program/v3/import-feed`
  - `/api/program/v3/refresh-cache`

Authorization je mozna:
- `Authorization: Bearer <secret>`
- nebo query `?secret=<secret>` (funguje, ale z bezpecnosti je horsi)

### Feed API key aliasy v kodu

Kod postupne zkousi:

- `FEED_API_KEY`
- `PROGRAM_FEED_API_KEY`
- `REPLIT_API_KEY`
- `PROGRAM_API_KEY`
- `API_KEY`

Doporuceni: pouzivat jen `PROGRAM_FEED_API_KEY`, ostatni aliasy drzet prazdne
kvuli predikovatelnosti a mensimu riziku omylu.

## 5) Program Feed Contract v1 (co validator ocekava)

Schema:

- `schema_version = "program-feed.v1"`
- `revision`, `generated_at`, `valid_until`, `stale_after`
- `timezone = "Europe/Prague"`
- `blocks[]`

Kazdy block musi mit:

- `block_id`
- `starts_at`, `ends_at` (ISO UTC)
- `title`
- `video_id` (string nebo null)
- `channel`
- `source_type`
- `priority` (integer)
- `is_pinned` (boolean)
- `is_locked` (boolean)
- `feed_version`

HMAC:
- HTTP header: `x-signature: v1=<hex>`
- podepisuje se **raw response body**
- algoritmus: HMAC-SHA256

Freshness:
- `fresh`: `now <= valid_until`
- `stale-allowed`: `valid_until < now <= stale_after`
- `expired`: `now > stale_after`

## 6) Co je dulezite pro security audit (checklist)

### A) Tajemstvi a rotace

- [ ] Vsechny secrety jen ve Vercel env, nikdy v repu
- [ ] Rotace: `PROGRAM_FEED_API_KEY`, `PROGRAM_FEED_HMAC_SECRET`, `PROGRAM_CACHE_CRON_SECRET`
- [ ] Overit, ze se secrety neobjevuji v logu/monitoringu

### B) Ochrana endpointu

- [ ] `PROGRAM_CACHE_CRON_SECRET` musi byt nastavene (jinak jsou cron endpointy public)
- [ ] Cron volat pres Bearer header, ne pres query string
- [ ] Zkontrolovat rate-limit na operational endpointy

### C) Integrita feedu

- [ ] `PROGRAM_FEED_HMAC_SECRET` musi byt nastavene (jinak warning/skip verify)
- [ ] Overit, ze Replit podepisuje presne raw body
- [ ] Otestovat chovani na invalid signature / replay / stale / expired

### D) Supabase hardening

- [ ] Overit RLS policy na `sources`, `videos`, `ingest_runs`
- [ ] Zkontrolovat, jestli anon key ma jen nutna prava
- [ ] Zvasit presun server write operaci na service-role key

### E) Replit proxy vrstva

- [ ] Overit povolene domeny (`PROGRAM_FEED_URL`, `REPLIT_URL`)
- [ ] Overit, ze proxy neumozni open redirect/SSRF mimo whitelist
- [ ] Omezit debug headery v produkci (uz jsou jen non-prod)

### F) Observabilita

- [ ] Pravidelne kontrolovat `/api/program/v3/health?includeFeedImport=1`
- [ ] Alert na status `error` nebo opakovane `warning`
- [ ] Alert na starnuti cache (`cache-freshness`)

## 7) Zname rizikove body (aktualni stav)

1. **Dvojita cesta k Replit datam**
   - jedna cesta je strict import validator (HMAC, freshness)
   - jina cesta je direct/proxy fetch (API key, ale ne plna HMAC kontrola)
   - doporuceni: sjednotit na jednu canonical cestu

2. **Aliasy API key env**
   - vice moznych promennych zvysuje riziko omylu
   - doporuceni: standardizovat na 1-2 oficialni nazvy

3. **Query secret podpora**
   - pohodlna, ale muze unikat v URL logach/historii
   - doporuceni: preferovat Bearer header

4. **Anon key pro server write**
   - funguje, ale je treba potvrdit minimalni prava a RLS
   - doporuceni: oddelit browser anon key a server service-role

## 8) Vercel cron konfigurace

Soubor: `vercel.json`

- `/api/program/v3/refresh-cache` kazdych 15 minut
- `/api/program/v3/import-feed` kazdych 5 minut

Bezpecnost:
- cron endpointy musi byt chranene `PROGRAM_CACHE_CRON_SECRET`

## 9) Rychle testy pro kolegu (manual smoke)

Priklady:

```bash
# Health + import stav
curl -sS "https://<app-domain>/api/program/v3/health?includeFeedImport=1"

# Manual import feedu (dop. Bearer)
curl -sS -H "Authorization: Bearer <PROGRAM_CACHE_CRON_SECRET>" \
  "https://<app-domain>/api/program/v3/import-feed"

# Manual refresh cache (feed + youtube)
curl -sS -H "Authorization: Bearer <PROGRAM_CACHE_CRON_SECRET>" \
  "https://<app-domain>/api/program/v3/refresh-cache"
```

Ocekavane minimum:
- import endpoint vraci `ok: true` nebo `status: warning` (ne `error`)
- health `overallStatus` neni `error`
- `programFeedImport.signatureVerified` je `true`

## 10) Poznamka k Agent Packet Contract

V tomto repozitari neni endpoint, ktery by nativne zpracovaval `agent-packet.v1`
(`APPLY_PACKET` flow). Pokud je potreba tento tok zabezpecit a provozovat primo
v appce, je vhodne doplnit:

- dedikovany endpoint pro packet ingest
- podpis/expiraci/replay ochranu packetu
- explicitni allowlist podporovanych akci
