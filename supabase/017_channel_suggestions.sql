-- Viewer-submitted channel suggestions for the /kanaly page.
--
-- Run in Supabase SQL editor (or via CLI) after deploy:
--   supabase db execute --file supabase/017_channel_suggestions.sql
--
-- Inserts go through app/api/kanaly/channel-suggestions (service_role).
-- RLS is enabled with no public policies — only service_role can read/write.

create table if not exists public.channel_suggestions (
  id uuid primary key default gen_random_uuid(),
  channel_name text not null,
  channel_url text not null,
  reason text not null,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists channel_suggestions_created_at_idx
  on public.channel_suggestions (created_at desc);

alter table public.channel_suggestions enable row level security;
