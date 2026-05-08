-- Jasné zprávy — RLS pro veřejný read-only přístup z webu (anon klíč).
-- Spusť v Supabase SQL Editoru po 001_jasne_zpravy.sql.
--
-- Princip:
--   * Service role (= ANS backend) RLS bypassuje vždy → pipeline dál zapisuje.
--   * Anon klíč (= veřejný web) vidí jen `published` vydání a jejich
--     `published` zprávy + zdroje. `draft`/`review`/`failed`/`retracted` jsou
--     skryté.
--   * `news_runs` zůstává úplně zavřená pro anon (interní log).

-- 1) Zapnout RLS
alter table news_editions enable row level security;
alter table news_items    enable row level security;
alter table news_sources  enable row level security;
alter table news_runs     enable row level security;

-- 2) news_editions — anon vidí jen status='published'
drop policy if exists "anon read published editions" on news_editions;
create policy "anon read published editions"
  on news_editions for select
  to anon
  using (status = 'published');

-- 3) news_items — anon vidí published item v published edition
drop policy if exists "anon read published items" on news_items;
create policy "anon read published items"
  on news_items for select
  to anon
  using (
    status = 'published'
    and exists (
      select 1 from news_editions e
      where e.id = news_items.edition_id
        and e.status = 'published'
    )
  );

-- 4) news_sources — anon vidí zdroje pro viditelné published items
drop policy if exists "anon read sources of published items" on news_sources;
create policy "anon read sources of published items"
  on news_sources for select
  to anon
  using (
    exists (
      select 1
      from news_items i
      join news_editions e on e.id = i.edition_id
      where i.id = news_sources.news_item_id
        and i.status = 'published'
        and e.status = 'published'
    )
  );

-- 5) news_runs — žádná anon politika, tj. anon nevidí nic. (Service role
--    bypassuje RLS, takže ANS si dál čte vlastní log přes /runs endpoint.)

-- 6) Sanity grants pro anon role na úrovni schématu (Supabase to obvykle
--    má z výroby, ale pro jistotu).
grant usage on schema public to anon;
grant select on news_editions, news_items, news_sources to anon;
