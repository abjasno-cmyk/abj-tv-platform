-- Přidání pouze kanálu Časopis Argument (bez dotyku ostatních záznamů).
begin;

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
  notes,
  channel_id,
  uploads_playlist_id
)
select
  'Časopis Argument',
  'youtube',
  'https://www.youtube.com/@casopisargument3584',
  'B',
  'komentář',
  'CZ',
  'cs',
  true,
  'support',
  null,
  'UC9si6gMYt2_5veSv9HVJVsQ',
  'UU9si6gMYt2_5veSv9HVJVsQ'
where not exists (
  select 1
  from sources s
  where s.platform = 'youtube'
    and s.source_name = 'Časopis Argument'
);

commit;
