-- ABJ X social layer: persistent comments, reactions and shares.
-- Run in Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists abjx_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id text not null,
  video_id text not null,
  session_id text not null default 'anon',
  author_name text not null default 'Divák ABJ',
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create table if not exists abjx_post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id text not null,
  video_id text not null,
  session_id text not null,
  created_at timestamptz not null default now(),
  constraint abjx_post_reactions_post_session_unique unique (post_id, session_id)
);

create table if not exists abjx_post_shares (
  id uuid primary key default gen_random_uuid(),
  post_id text not null,
  video_id text not null,
  session_id text not null default 'anon',
  created_at timestamptz not null default now()
);

create index if not exists abjx_post_comments_post_id_created_at_idx
  on abjx_post_comments (post_id, created_at asc);
create index if not exists abjx_post_reactions_post_id_idx
  on abjx_post_reactions (post_id);
create index if not exists abjx_post_shares_post_id_idx
  on abjx_post_shares (post_id);

alter table abjx_post_comments enable row level security;
alter table abjx_post_reactions enable row level security;
alter table abjx_post_shares enable row level security;

drop policy if exists "abjx comments select anon" on abjx_post_comments;
create policy "abjx comments select anon"
  on abjx_post_comments
  for select
  to anon
  using (true);

drop policy if exists "abjx comments insert anon" on abjx_post_comments;
create policy "abjx comments insert anon"
  on abjx_post_comments
  for insert
  to anon
  with check (true);

drop policy if exists "abjx reactions select anon" on abjx_post_reactions;
create policy "abjx reactions select anon"
  on abjx_post_reactions
  for select
  to anon
  using (true);

drop policy if exists "abjx reactions insert anon" on abjx_post_reactions;
create policy "abjx reactions insert anon"
  on abjx_post_reactions
  for insert
  to anon
  with check (true);

drop policy if exists "abjx shares select anon" on abjx_post_shares;
create policy "abjx shares select anon"
  on abjx_post_shares
  for select
  to anon
  using (true);

drop policy if exists "abjx shares insert anon" on abjx_post_shares;
create policy "abjx shares insert anon"
  on abjx_post_shares
  for insert
  to anon
  with check (true);

grant select, insert on abjx_post_comments to anon;
grant select, insert on abjx_post_reactions to anon;
grant select, insert on abjx_post_shares to anon;
