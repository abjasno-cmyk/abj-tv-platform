-- Oprava známých zastaralých / chybějících YouTube ID.
-- Spusť v Supabase SQL Editoru, pokud kanály nemají videa i po deployi auto-heal logiky.

begin;

update sources
set
  channel_id = 'UCmddwtkOBmS__HAH1dlF4Iw',
  uploads_playlist_id = 'UUmddwtkOBmS__HAH1dlF4Iw'
where platform = 'youtube'
  and source_name = 'Angelika Bazalová';

update sources
set
  channel_id = 'UCIX6MozjkkRZwdqESX_Vt4A',
  uploads_playlist_id = 'UUIX6MozjkkRZwdqESX_Vt4A'
where platform = 'youtube'
  and source_name = 'Datarun';

update sources
set
  channel_id = 'UC9si6gMYt2_5veSv9HVJVsQ',
  uploads_playlist_id = 'UU9si6gMYt2_5veSv9HVJVsQ'
where platform = 'youtube'
  and source_name = 'Časopis Argument';

commit;
