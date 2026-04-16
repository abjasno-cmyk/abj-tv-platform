alter table sources add column if not exists uploads_playlist_id text;

create table if not exists videos (
  id uuid primary key default gen_random_uuid(),
  video_id text not null unique,
  source_id uuid references sources(id) on delete set null,
  channel_id text not null,
  title text not null,
  thumbnail text,
  published_at timestamptz,
  scheduled_start_time timestamptz,
  kind text not null default 'vod' check (kind in ('vod', 'upcoming')),
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists videos_published_at_idx on videos (published_at desc);
create index if not exists videos_scheduled_start_time_idx on videos (scheduled_start_time desc);
create index if not exists videos_channel_id_idx on videos (channel_id);

create table if not exists ingest_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('running', 'success', 'failed')),
  api_calls integer not null default 0,
  videos_upserted integer not null default 0,
  error_text text
);
