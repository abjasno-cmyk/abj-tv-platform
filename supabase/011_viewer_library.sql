-- Viewer library: uložená videa + metadata u sledovacího progresu (název, náhled).

create table if not exists saved_videos (
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id text not null,
  title text not null default '',
  thumbnail_url text,
  channel_name text,
  created_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

alter table video_progress add column if not exists title text;
alter table video_progress add column if not exists thumbnail_url text;
alter table video_progress add column if not exists channel_name text;

create index if not exists saved_videos_user_created_idx on saved_videos(user_id, created_at desc);

alter table saved_videos enable row level security;

drop policy if exists "saved videos own" on saved_videos;
create policy "saved videos own"
  on saved_videos
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, delete on saved_videos to authenticated;
