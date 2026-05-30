-- F-C1: Enable Row Level Security on the four exposed core tables.
--
-- Context: the whole app (reads AND the ingest cron writes) runs on the public
-- anon key. The cron now uses the service_role key (createIngestClient /
-- createSupabaseServiceClient), which bypasses RLS, so trusted writes keep
-- working once RLS is on. Anon/authenticated callers get read-only access to
-- the public catalog tables and no access to user messages they don't own.
--
-- IMPORTANT ordering: deploy the service-role ingest code FIRST, then run this
-- migration. Otherwise the cron (still on anon) loses write access.
--
-- Policies are additive (only ENABLE + CREATE POLICY). No DROP, no data change.

-- videos: public read-only catalog; writes only via service_role.
alter table public.videos enable row level security;

create policy "videos_public_read"
  on public.videos
  for select
  to anon, authenticated
  using (true);

-- sources: public read-only channel config; writes only via service_role.
alter table public.sources enable row level security;

create policy "sources_public_read"
  on public.sources
  for select
  to anon, authenticated
  using (true);

-- ingest_runs: import telemetry. Readable (no secrets, just run stats);
-- inserts/updates/deletes only via service_role.
alter table public.ingest_runs enable row level security;

create policy "ingest_runs_public_read"
  on public.ingest_runs
  for select
  to anon, authenticated
  using (true);

-- messages: user-owned. Each authenticated user sees and manages only their
-- own rows. service_role retains full access for server-side operations.
alter table public.messages enable row level security;

create policy "messages_select_own"
  on public.messages
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "messages_insert_own"
  on public.messages
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "messages_update_own"
  on public.messages
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "messages_delete_own"
  on public.messages
  for delete
  to authenticated
  using (user_id = auth.uid());
