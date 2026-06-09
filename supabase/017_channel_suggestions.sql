-- Viewer-submitted channel suggestions for the /kanaly page.
-- Inserts are performed server-side via service_role; no public read.

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
