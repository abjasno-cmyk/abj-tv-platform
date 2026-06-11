begin;

-- POZOR: Nespouštěj tento soubor pro přidání jednoho kanálu — použij db/add_source.sql.
-- Tento skript je jen pro hromadnou synchronizaci metadat kanálů, které už v DB jsou.
-- Páruje VÝHRADNĚ podle channel_url (ne podle source_name), aby nepřepisoval cizí řádky.
-- Při změně channel_url vynuluje channel_id a uploads_playlist_id → cron je znovu doplní z URL.
with incoming (
  source_name,
  platform,
  channel_url,
  priority,
  category,
  country,
  language,
  active,
  playlist_role,
  notes
) as (
  values
    ('Tomio Okamura - oficiální profil', 'youtube', 'https://www.youtube.com/channel/UCe0c2rUjCHtQSf2XY7ulCQA', 'A', 'politika', 'CZ', 'cs', true, 'main', null),
    ('Radim Panenka', 'youtube', 'https://www.youtube.com/@RadimPanenka', 'B', 'rozhovor', 'CZ', 'cs', true, 'support', null),
    ('Karel Havlíček', 'youtube', 'https://www.youtube.com/@KarelHavl%C3%AD%C4%8Dek-l1d', 'A', 'politika', 'CZ', 'cs', true, 'main', null),
    ('TVOTV', 'youtube', 'https://www.youtube.com/channel/UCVry0p4SnE6UpJCYVwaLqIg', 'B', 'zprávy', 'CZ', 'cs', true, 'support', null),
    ('SMER - Sociálna Demokracia', 'youtube', 'https://www.youtube.com/channel/UCdU1Hed-u-HJky_GNcPABeQ', 'B', 'politika', 'SK', 'sk', true, 'support', null),
    ('Ilona Švihlíková Official', 'youtube', 'https://www.youtube.com/@IlonaSvihl%C3%ADkovaOfficial', 'B', 'ekonomika', 'CZ', 'cs', true, 'support', null),
    ('Spolek Svatopluk', 'youtube', 'https://www.youtube.com/@SpolekSvatopluk', 'B', 'společnost', 'CZ', 'cs', true, 'support', null),
    ('O čem se mlčí', 'youtube', 'https://www.youtube.com/@O%C4%8Demseml%C4%8D%C3%AD', 'B', 'komentář', 'CZ', 'cs', true, 'support', null),
    ('Hlavné správy', 'youtube', 'https://www.youtube.com/@Hlavnespravy-lc9yc', 'B', 'zprávy', 'SK', 'sk', true, 'support', null),
    ('Jindřich Rajchl Česká republika', 'youtube', 'https://www.youtube.com/@Jind%C5%99ich_Rajchl/videos', 'A', 'politika', 'CZ', 'cs', true, 'main', null),
    ('V.O.X. NEWS', 'youtube', 'https://www.youtube.com/@vox-news', 'B', 'zprávy', 'CZ', 'cs', true, 'support', null),
    ('Kateřina Konečná', 'youtube', 'https://www.youtube.com/@KonecnaKaterina/featured', 'B', 'politika', 'CZ', 'cs', true, 'support', null),
    ('Echo Podcasty', 'youtube', 'https://www.youtube.com/@echopodcasty', 'B', 'podcast', 'CZ', 'cs', true, 'support', null),
    ('Datarun', 'youtube', 'https://www.youtube.com/@Datarun_cz', 'B', 'analýza', 'CZ', 'cs', true, 'support', null),
    ('Petr Bureš TV', 'youtube', 'https://www.youtube.com/@petrburestv', 'B', 'rozhovor', 'CZ', 'cs', true, 'support', null),
    ('Hovory ze země', 'youtube', 'https://www.youtube.com/@hovoryzezeme', 'B', 'rozhovor', 'CZ', 'cs', true, 'support', null),
    ('Miroslav Kamenský', 'youtube', 'https://www.youtube.com/@miroslavkamensky3577/videos', 'B', 'rozhovor', 'CZ', 'cs', true, 'support', null),
    ('Časopis Argument', 'youtube', 'https://www.youtube.com/@casopisargument3584', 'B', 'komentář', 'CZ', 'cs', true, 'support', null)
),
updated as (
  update sources s
  set
    source_name = i.source_name,
    channel_url = i.channel_url,
    channel_id = case when s.channel_url is distinct from i.channel_url then null else s.channel_id end,
    uploads_playlist_id = case when s.channel_url is distinct from i.channel_url then null else s.uploads_playlist_id end,
    priority = i.priority,
    category = i.category,
    country = i.country,
    language = i.language,
    active = i.active,
    playlist_role = i.playlist_role,
    notes = i.notes
  from incoming i
  where s.platform = i.platform
    and s.channel_url = i.channel_url
  returning s.id
)
insert into sources (
  source_name,
  platform,
  channel_url,
  priority,
  category,
  country,
  language,
  active,
  playlist_role,
  notes
)
select
  i.source_name,
  i.platform,
  i.channel_url,
  i.priority,
  i.category,
  i.country,
  i.language,
  i.active,
  i.playlist_role,
  i.notes
from incoming i
where not exists (
  select 1
  from sources s
  where s.platform = i.platform
    and s.channel_url = i.channel_url
);

commit;
