# ProudX — tenant-leak testy a launch checklist (ABJ-9)

## Tenant-leak test — protokol a výsledky (17. 8. 2026, dev.proudx.cz)

Cíl: žádný průnik dat, obsahu ani značky mezi vertikálami. Prováděno proti živému stagingu.

| Kontrola | Výsledek |
|---|---|
| VEROX stránky na ProudX (`/noviny`, `/nazory`, `/studio`, `/kanaly`, `/muj-verox`, `/about`, `/auth/*`) | ✅ vše 404 |
| VEROX API na ProudX (`/api/wall`, `/api/auth/*`, `/api/studio/*`, `/api/noviny/*`, `/api/nazory/*`, `/api/viewer/*`) | ✅ vše 404 |
| Brand izolace: řetězec „verox" v servírovaném HTML ProudX | ✅ 0 výskytů (ikony, OG, skripty tenant-gatované) |
| JS bundly ProudX bez VEROX komponent | ✅ ověřeno (route-level splitting; audit 10. 8. + průběžně) |
| Engine data: `abj_engine_proudx` schéma, vlastní seed 91 zdrojů, 0 VEROX zdrojů | ✅ (incident seedu vyřešen 10. 8., od té doby stabilní) |
| Supabase izolace: ProudX vlastní projekt `eutexfxgzwcfqljhrdnv`, žádné sdílené klíče v env | ✅ per-projekt env na Vercelu |
| Obrácený směr: „proudx" na www.verox.cz | ✅ jen sdílené configy v bundlu (bez viditelného obsahu), stránky/K API ProudX na VEROXu neexistují |

**48h běh:** dev.proudx.cz běží nepřetržitě od 8. 8. (playout, feed, program) — kritérium 48 h splněno mnohanásobně; incident log: 1 seed-leak (vyřešen), 0 výpadků playoutu.

## Launch checklist (stav před ABJ-10)

- [x] Právní stránky: `/privacy`, `/terms`, `/data-deletion` (200)
- [x] `robots.txt` + `sitemap.xml` + `sitemap-videos.xml` (200; fix allowlistu PR #225)
- [x] OG/social image (`/design/brand/proudx-og.png`, propsaný v meta)
- [x] Favicon/ikony z tenant configu
- [x] Vlastní engine + DB schéma + VOD katalog per vertikála
- [x] Design schválen klientkami (17. 8.)
- [x] E-maily/auth: netýká se (auth modul na ProudX vypnutý)
- [ ] Git-connect Vercel projektu + Production Branch `staging` (klientky, guide odeslán)
- [ ] Vercel Web Analytics Enable (klientky)
- [x] Cutover příprava (19. 8. večer): production branch `main`, staging = preview větev s heslem (dev.proudx.cz jako branch doména), produkce bez hesla ověřená na vercel.app URL, domény přidané do projektu (verified), apex→www 308 redirect nastaven
- [ ] **Launch 20. 8. 15:00 — jediný zbývající krok: DNS u Websupportu (Domény → proudx.cz → DNS záznamy):**
  - `www` → **CNAME** `9e5b42030ac652f3.vercel-dns-016.com.`
  - `@` (kořen) → **A** `216.150.1.1` a **A** `216.150.16.1` — NAHRADIT stávající A `37.9.175.165` (pozor: pokud na proudx.cz dnes něco běží, tímto se vypne)
  - `dev` CNAME beze změny
  - Po propagaci: smoke matice (live, videa, právní, OG, redirect apex→www), oznámení, dohled
- [ ] Po launchi: Search Console property pro proudx.cz (volitelné), oznámení klientkám

**Rollback plán launche:** ostrá doména se mapuje na Vercel projekt — případný rollback = přemapovat doménu zpět / vrátit Basic Auth env; datová vrstva se launch dnem nemění (běží tatáž jako na stagingu).
