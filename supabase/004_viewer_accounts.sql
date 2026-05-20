-- Verox free viewer accounts (auth, social interactions, progress, consents)
-- Run in Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  provider text,
  role text not null default 'viewer' check (role in ('viewer', 'moderator', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create table if not exists viewer_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists video_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id text not null,
  position_seconds integer not null default 0,
  duration_seconds integer,
  progress_percent numeric(5,2),
  completed boolean not null default false,
  last_watched_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

create table if not exists likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  created_at timestamptz not null default now(),
  unique(user_id, entity_type, entity_id)
);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  parent_id uuid references comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  status text not null default 'published' check (status in ('published', 'hidden', 'flagged', 'pending', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists follows (
  user_id uuid not null references auth.users(id) on delete cascade,
  channel_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, channel_id)
);

create table if not exists consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null,
  granted boolean not null,
  source text,
  created_at timestamptz not null default now()
);

create index if not exists viewer_activity_user_created_idx on viewer_activity(user_id, created_at desc);
create index if not exists viewer_activity_entity_idx on viewer_activity(entity_type, entity_id, created_at desc);
create index if not exists comments_entity_status_created_idx on comments(entity_type, entity_id, status, created_at desc);
create index if not exists comments_user_created_idx on comments(user_id, created_at desc);
create index if not exists likes_entity_idx on likes(entity_type, entity_id);
create index if not exists video_progress_user_updated_idx on video_progress(user_id, last_watched_at desc);
create index if not exists consents_user_type_created_idx on consents(user_id, consent_type, created_at desc);

create or replace function viewer_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_set_updated_at_trigger on profiles;
create trigger profiles_set_updated_at_trigger
before update on profiles
for each row execute function viewer_set_updated_at();

drop trigger if exists comments_set_updated_at_trigger on comments;
create trigger comments_set_updated_at_trigger
before update on comments
for each row execute function viewer_set_updated_at();

create or replace function is_admin_or_moderator()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'moderator')
  );
$$;

alter table profiles enable row level security;
alter table viewer_activity enable row level security;
alter table video_progress enable row level security;
alter table likes enable row level security;
alter table comments enable row level security;
alter table follows enable row level security;
alter table consents enable row level security;

drop policy if exists "profiles select own" on profiles;
create policy "profiles select own"
  on profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles insert own" on profiles;
create policy "profiles insert own"
  on profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles update own" on profiles;
create policy "profiles update own"
  on profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "viewer activity own" on viewer_activity;
create policy "viewer activity own"
  on viewer_activity
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "video progress own" on video_progress;
create policy "video progress own"
  on video_progress
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "likes select own" on likes;
create policy "likes select own"
  on likes
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "likes insert own" on likes;
create policy "likes insert own"
  on likes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "likes delete own" on likes;
create policy "likes delete own"
  on likes
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "comments published read" on comments;
create policy "comments published read"
  on comments
  for select
  to anon, authenticated
  using (status = 'published' or auth.uid() = user_id or is_admin_or_moderator());

drop policy if exists "comments create authenticated" on comments;
create policy "comments create authenticated"
  on comments
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "comments update own" on comments;
create policy "comments update own"
  on comments
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "comments delete own" on comments;
create policy "comments delete own"
  on comments
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "comments moderator update status" on comments;
create policy "comments moderator update status"
  on comments
  for update
  to authenticated
  using (is_admin_or_moderator())
  with check (is_admin_or_moderator());

drop policy if exists "follows own" on follows;
create policy "follows own"
  on follows
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "consents own" on consents;
create policy "consents own"
  on consents
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on profiles to authenticated;
grant select, insert on viewer_activity to authenticated;
grant select, insert, update, delete on video_progress to authenticated;
grant select, insert, delete on likes to authenticated;
grant select on comments to anon;
grant select, insert, update, delete on comments to authenticated;
grant select, insert, delete on follows to authenticated;
grant select, insert on consents to authenticated;
