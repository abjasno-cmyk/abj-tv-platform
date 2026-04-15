create extension if not exists "pgcrypto";

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  platform text not null default 'youtube',
  channel_url text not null,
  channel_id text,
  priority text not null check (priority in ('A', 'B', 'C')),
  category text,
  country text,
  language text,
  active boolean default true,
  playlist_role text,
  notes text
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  text text not null,
  created_at timestamptz default now()
);

alter table messages disable row level security;
alter table sources disable row level security;
