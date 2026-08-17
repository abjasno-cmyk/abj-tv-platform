# Restore test — ověření obnovy proti čisté DB (17. 8. 2026)

Akceptační kritérium ABJ-7: „DB migrace jsou konsolidované do jedné baseline, existuje záloha a obnova je ověřená proti čisté DB." Tento protokol dokumentuje provedený test a **závazné pořadí obnovy**.

## Prostředí

- Čistý Postgres 16 (`pgvector/pgvector:pg16` v Dockeru — kvůli `vector` extension pro verox_search)
- Stub Supabase prostředí (viz níže) — role `anon/authenticated/service_role`, schéma `auth` (users, `auth.uid()/role()/jwt()`), schéma `storage` (buckets/objects — vyžaduje 013), extensions `pgcrypto`, `uuid-ossp`, `pg_trgm`, `vector`

## Závazné pořadí obnovy (zjištěno testem!)

1. **Base vrstva `db/`**: `schema.sql` → `v3_ingest.sql` → `v3_program_engine.sql` → `wall_community.sql`
2. **`supabase/023_baseline_drift_tables.sql`** — ⚠️ MUSÍ běžet PŘED číselnou řadou: konsoliduje tabulky, které v produkci vznikly ručně (news_editions…), a starší migrace (002+) na ně odkazují. Naivní pořadí 002→024 na čisté DB selže.
3. **`supabase/002–022`** v číselném pořadí
4. **`supabase/024_abj_engine_proudx_schema.sql`**

## Výsledek

- Celá řada aplikována s `ON_ERROR_STOP` bez chyby.
- Inventář: **55/55 repo-spravovaných tabulek** (`public.*`) se jmenovitě shoduje s produkcí `fdeeememswiypqfoddfz` (ověřeno proti živému výpisu 17. 8.).
- **8 tabulek `abj_engine.*` v obnově záměrně chybí** — engine si schéma i tabulky vytváří sám při startu (SQLAlchemy `Base.metadata.create_all`, `abj-engine/abj_engine/database.py`). Totéž platí pro `abj_engine_proudx` (024 zakládá jen prázdné schéma, viz jeho hlavička). Obnova engine vrstvy = spustit engine proti obnovené DB.
- Engine schémata nejsou v PostgREST exposed schemas a anon/authenticated k nim nemají granty — advisor hláška „RLS disabled" na `abj_engine.*` je tím mitigována (přístup jen přímým Postgres připojením engine).

## Zálohy

- Supabase automatické denní zálohy běží na projektu (Pro plán); bod obnovy = záloha + tento migrační postup pro čistou rekonstrukci schématu.
- Data (obsah tabulek) se obnovují ze Supabase backup/PITR, tento postup řeší **strukturu** od nuly.

## Stub bootstrap (pro reprodukci)

Soubor není v repu (test-only); obsah: role anon/authenticated/service_role (nologin), `create extension pgcrypto, "uuid-ossp", pg_trgm, vector`, schéma `auth` s tabulkou `users(id uuid pk, email, raw_user_meta_data, created_at)` a funkcemi `auth.uid()/auth.role()/auth.jwt()` čtoucími `request.jwt.*` GUC, schéma `storage` s `buckets/objects` + `storage.foldername()`, schéma `supabase_migrations` s `schema_migrations`.
