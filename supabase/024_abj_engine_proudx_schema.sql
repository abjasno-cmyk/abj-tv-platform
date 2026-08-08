-- 024: Schéma druhé engine instance (vertikála ProudX).
--
-- Tabulky si engine vytvoří sám při prvním startu (SQLAlchemy metadata,
-- env ABJ_PG_SCHEMA=abj_engine_proudx). Parita s abj_engine: schéma není
-- v PostgREST exposed schemas a anon/authenticated nedostávají žádné granty.
--
-- Aplikace: přes trackovaný kanál (supabase db push / apply_migration).
-- Pozn. 8. 8. 2026: Supabase MCP je aktuálně read-only — po odblokování
-- aplikovat tímto souborem, NE ručně v SQL editoru.

create schema if not exists abj_engine_proudx;
