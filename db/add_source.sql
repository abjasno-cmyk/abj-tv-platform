-- Přidání JEDNOHO nového kanálu do Supabase (bez dotyku ostatních záznamů).
-- Nahraď hodnoty v bloku incoming a spusť v SQL Editoru.

begin;

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
  values (
    'Název kanálu',
    'youtube',
    'https://www.youtube.com/@handle',
    'B',
    'komentář',
    'CZ',
    'cs',
    true,
    'support',
    null
  )
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

-- Po vložení: cron do 15 min doplní channel_id a uploads_playlist_id.
