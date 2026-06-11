-- Diagnostika: které aktivní YouTube kanály nemají kompletní ID pro ingest.
-- Spusť v Supabase SQL Editoru.

select
  source_name,
  channel_url,
  channel_id,
  uploads_playlist_id,
  case
    when channel_id is null then 'chybí channel_id'
    when uploads_playlist_id is null then 'chybí uploads_playlist_id'
    else 'OK'
  end as stav
from sources
where platform = 'youtube'
  and active = true
order by
  case
    when channel_id is null or uploads_playlist_id is null then 0
    else 1
  end,
  source_name;
