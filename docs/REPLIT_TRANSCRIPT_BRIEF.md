# Podklad pro Replit: přepisy videí mimo program

**Verze:** 2026-06-12  
**Pro:** tým Replit engine (`abj-engine` / `attached-assets-abjasno`)  
**Od:** Verox frontend (`abj-tv-platform`, verox.cz)  
**Kontext:** archivní videa na `/videa` („Právě vyšlo“) nemají přepis, i když štítek **PŘEPIS VIDEA** je vidět.

---

## 1. Shrnutí problému

| Oblast | Stav dnes |
|--------|-----------|
| Videa v **dnešním/zítřejším programu** (`/program` bloky) | Funguje — `transcript_state` + `GET /transcript/{id}` |
| Videa jen v **archivu** (Supabase `videos`, sekce „Právě vyšlo“ na `/videa`) | **Nefunguje** — Replit vrací 404, přepis neexistuje |
| Signál z Veroxu „začni generovat přepis“ | **Neexistuje** |

**Příklad z produkce (2026-06-12):**

| Video | `video_id` | V programu? | `GET /transcript` | YouTube titulky |
|-------|------------|-------------|-------------------|-----------------|
| Bobošíková (program) | `cke9CtEDFug` | ano, `ready` | `200 ready` + text | — |
| Kratochvíl / Raptor-TV (archiv) | `mkDFTpY7Wrw` | ne | `404` → `unavailable` | vypnuté |
| Tucker (archiv, v programu) | `VinRZ02cAHQ` | ano, `ready` | `200 ready` | — |

**Závěr:** Replit dnes generuje přepisy pro videa **v programovém feedu**. Archivní videa, která Verox ingestuje z YouTube kanálů, Replit **nevidí** a do fronty přepisů se **nedostanou**.

---

## 2. Současná architektura

```
┌─────────────────────────────────────────────────────────────────┐
│  REPLIT ENGINE                                                   │
│                                                                  │
│  GET /program          → bloky + transcript_state per video_id  │
│  GET /transcript/{id}  → přepis nebo stav (ready/processing/…)  │
│                                                                  │
│  [generování přepisů — logika jen na Replitu, mimo Verox repo]  │
└───────────────────────────▲─────────────────────────────────────┘
                            │ X-Api-Key
                            │ GET only
┌───────────────────────────┴─────────────────────────────────────┐
│  VEROX (Vercel / Next.js)                                        │
│                                                                  │
│  Cron /15 min: refresh-cache                                     │
│    → fetchVideos: YouTube → Supabase videos                      │
│    → import program feed                                         │
│                                                                  │
│  UI: štítek PŘEPIS VIDEA → GET /api/transcript/{id}             │
│       (proxy na Replit /transcript/{id})                         │
└─────────────────────────────────────────────────────────────────┘
```

**Důležité:** Verox **nikdy neposílá POST** na Replit transcript endpoint. Jediná interakce je **GET** s `video_id` v URL.

---

## 3. Co Verox dnes posílá a co ne

### 3.1 `GET /transcript/{video_id}`

| Položka | Hodnota |
|---------|---------|
| Metoda | `GET` |
| Autentizace | `X-Api-Key: <FEED_API_KEY>` |
| Tělo | žádné |
| Query | volitelně předané z klienta |
| Metadata | **žádná** (bez title, channel, published_at, source) |

**Očekávaná odpověď** (kontrakt implementovaný na Veroxu):

```json
{
  "video_id": "cke9CtEDFug",
  "status": "ready",
  "transcript": "…český text…",
  "transcript_at": "2026-06-12T15:33:39.746065+00:00",
  "transcript_original": null,
  "source_lang": "cs"
}
```

### 3.2 Stavy (`status` / `transcript_state`)

| Hodnota | Význam na Veroxu | Feed `transcript_state` |
|---------|------------------|-------------------------|
| `ready` | Zobrazit přepis | `ready` |
| `processing` / `pending` | Poll každé 3 s, animace „Připravujeme“ | `pending` |
| `not_ready_live` | „Přepis bude po skončení vysílání“ | `not_ready_live` |
| `unavailable` | „Přepis není k dispozici“ | `unavailable` |
| HTTP 404 (video ne v DB) | Verox mapuje na `unavailable` | — |

**Anglická videa s překladem** (již podporováno na Veroxu):

```json
{
  "video_id": "…",
  "status": "ready",
  "transcript": "…český překlad…",
  "transcript_original": "…English original…",
  "source_lang": "en"
}
```

### 3.3 Co Verox **neposílá**

- seznam nových videí po ingestu z YouTube
- webhook při publikaci v archivu
- `POST` pro zařazení do fronty
- metadata videa (název, kanál, jazyk) — jen `video_id`

---

## 4. Odkud Verox bere videa (archiv)

**Cron:** `GET /api/program/v3/refresh-cache` každých **15 minut**

1. Projde zdrojové kanály v Supabase (`sources` — Raptor-TV, Bobošíková, …)
2. Stáhne nová videa z YouTube uploads playlistu
3. Upsert do tabulky `videos` (`video_id`, `title`, `channel_name`, `published_at`, …)
4. **Nezavolá Replit**

Typická videa v sekci **„Právě vyšlo“** na https://www.verox.cz/videa jsou právě z tohoto ingestu — **nejsou** v `/program`, dokud je program engine nezařadí.

---

## 5. Požadavek na Replit

### Cíl

Přepis má být dostupný i pro **archivní videa ze sledovaných kanálů**, nejen pro bloky v dnešním programu.

### Priorita generování (návrh)

1. **P1** — bloky v `/program` s blízkým `starts_at` (stávající chování)
2. **P2** — nová videa z kanálů priority A/B (posledních 48–72 h)
3. **P3** — na vyžádání (lazy GET nebo explicitní enqueue)
4. **P4** — starší archiv (backfill)

---

## 6. Navrhované rozšíření API

Doporučujeme **kombinaci A + B**. Varianta C je minimum, pokud nechcete nový endpoint.

### Varianta A — Proaktivní fronta (doporučeno)

Verox po ingestu pošle dávku nových videí.

```
POST /transcript/enqueue
X-Api-Key: …
Content-Type: application/json
```

**Request:**

```json
{
  "videos": [
    {
      "video_id": "mkDFTpY7Wrw",
      "title": "Soudní jednání: Ivan Kratochvíl a spol. závěrečné řeči",
      "channel_name": "Raptor-TV",
      "published_at": "2026-06-12T14:00:00+02:00",
      "language": "cs",
      "source": "verox_archive_ingest",
      "priority": "normal"
    }
  ]
}
```

**Response `202 Accepted`:**

```json
{
  "accepted": 1,
  "skipped": 0,
  "results": [
    {
      "video_id": "mkDFTpY7Wrw",
      "queue_status": "queued",
      "transcript_state": "pending"
    }
  ]
}
```

**Pravidla:**

- Idempotentní — opakovaný POST se stejným `video_id` nesmí duplikovat job
- `skipped` pokud už `ready` nebo trvale `unavailable`
- Verox bude volat po `refresh-cache`, jen pro **nově upsertnutá** `video_id`

---

### Varianta B — Lazy generování na GET (doporučeno jako doplněk)

První `GET /transcript/{video_id}` u neznámého videa **nesmí** vracet holý 404.

**Doporučené chování:**

| Situace | HTTP | `status` |
|---------|------|----------|
| Přepis hotový | 200 | `ready` |
| Právě se generuje | 200 | `processing` |
| Zařazeno do fronty | 200 | `processing` |
| Živé vysílání | 200 | `not_ready_live` |
| Trvale nedostupné (např. titulky vypnuté) | 200 | `unavailable` |
| Endpoint neexistuje (špatná URL) | 404 | HTML / bez JSON |

**Důležité:** 404 s JSON tělem `{ "status": "unavailable" }` je v pořádku. **Prázdný 404** bez záznamu v DB Verox dnes interpretuje jako „video Replit nezná“.

---

### Varianta C — Rozšíření `/program` (volitelné)

Přidat do feedu bloky nebo sekci `archive_candidates` s `transcript_state` pro nedávno publikovaná videa mimo vysílání. Verox už `transcript_state` z programu čte každých 5 minut.

```json
{
  "block_id": "…",
  "video_id": "mkDFTpY7Wrw",
  "title": "…",
  "type": "archive",
  "transcript_state": "pending"
}
```

---

## 7. Co Verox implementuje po dohodě (na naší straně)

Po schválení kontraktu od Replitu:

1. **Po `refresh-cache`** — volání `POST /transcript/enqueue` pro nová videa (jen `video_id`, která v odpovědi ingestu přibyla)
2. **Polling** — beze změny (`processing` → poll 3 s, max 10 min)
3. **Štítek PŘEPIS VIDEA** — můžeme zpřísnit: skrýt u `unavailable` i pro archiv, pokud Replit začne vracet stav přes samostatný endpoint nebo bulk GET

Odhadovaná frekvence enqueue: desítky videí denně (ne tisíce) — dle počtu sledovaných kanálů a frekvence uploadu.

---

## 8. Akceptační kritéria

Pro uzavření mezery archiv ↔ přepis:

1. Nové video z kanálu Raptor-TV se objeví na `/videa` → do **30 minut** po ingestu (nebo po enqueue) je `GET /transcript/{id}` stav `processing` nebo `ready`, **ne** prázdný 404
2. Po dokončení: `status: ready`, `transcript` neprázdný, `transcript_at` vyplněný
3. Anglické video: `transcript_original` + český `transcript` (stávající chování u programových videí)
4. Video s vypnutými YouTube titulky: `status: unavailable` (ne věčné `processing`)
5. `POST /transcript/enqueue` je idempotentní
6. Existující programová videa — **bez regrese**

**Testovací video:** `mkDFTpY7Wrw` (Raptor-TV, české, titulky na YouTube vypnuté — musí projít přes vlastní ASR/Replit pipeline)

---

## 9. Produční endpointy (reference)

| Služba | URL (produkce) |
|--------|----------------|
| Replit engine | `https://abj-engine.replit.app` |
| Fallback | `https://attached-assets-abjasno.replit.app` |
| Verox proxy | `https://www.verox.cz/api/transcript/{video_id}` |
| Verox program | `https://www.verox.cz/api/program` |

Autentizace: stejný `X-Api-Key` jako u `/program` a `/feed`.

---

## 10. Otázky pro Replit tým

1. **Spouští se generování dnes jen z programových bloků?** Pokud ano, kde přesně v engine?
2. **Je `GET /transcript/{id}` u neznámého videa zamýšlen jako trigger fronty**, nebo čisté čtení?
3. **Preferujete `POST /transcript/enqueue`**, webhook, nebo interní polling YouTube kanálů na Replitu?
4. **Jaká je SLA** pro archivní videa (např. do 1 h od publikace)?
5. **Kdy je správný `unavailable`** vs. nekonečné `processing` (vypnuté titulky, live, příliš krátké video)?
6. **Máte už DB tabulku přepisů** oddělenou od programu, kam by šly zapisovat archivní videa?

---

## 11. Související PR na Veroxu

| PR | Obsah |
|----|-------|
| #184 | UI přepisů, Originál/Překlad, štítek na archivu |
| #186 | Oprava 404 handling, YouTube fallback pro videa s titulky |

**Poznámka:** YouTube fallback na Veroxu nepomůže u videí s vypnutými titulky (např. Kratochvíl). Pro ta videa je nutná **Replit ASR pipeline**.

---

## Příloha A — minimální OpenAPI sketch (enqueue)

```yaml
paths:
  /transcript/enqueue:
    post:
      summary: Zařadit videa do fronty přepisů
      security:
        - ApiKeyAuth: []
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [videos]
              properties:
                videos:
                  type: array
                  items:
                    type: object
                    required: [video_id]
                    properties:
                      video_id: { type: string }
                      title: { type: string }
                      channel_name: { type: string }
                      published_at: { type: string, format: date-time }
                      language: { type: string, enum: [cs, sk, en] }
                      source: { type: string }
                      priority: { type: string, enum: [high, normal, low] }
      responses:
        "202":
          description: Accepted
        "401":
          description: Invalid API key

  /transcript/{video_id}:
    get:
      summary: Stav nebo hotový přepis (stávající)
      # … viz sekce 3.1
```

---

*Dokument vznikl z analýzy repozitáře `abj-tv-platform` a produkčního chování verox.cz. Pro technické dotazy k integraci na straně Veroxu: issue/PR v GitHub repo.*
