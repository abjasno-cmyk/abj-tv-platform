-- Storage bucket for Názory images.
-- Run in Supabase SQL editor after 012_nazory.sql.

insert into storage.buckets (id, name, public)
values ('nazory-media', 'nazory-media', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "nazory media public read" on storage.objects;
create policy "nazory media public read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'nazory-media');

drop policy if exists "nazory media author upload" on storage.objects;
create policy "nazory media author upload"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'nazory-media');

drop policy if exists "nazory media author update" on storage.objects;
create policy "nazory media author update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'nazory-media')
  with check (bucket_id = 'nazory-media');
