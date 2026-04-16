-- V3 Program Engine schema extension
-- Run after db/v3_ingest.sql

alter table if exists videos
  add column if not exists scheduled_start_at timestamptz,
  add column if not exists video_type text,
  add column if not exists channel_name text,
  add column if not exists is_abj boolean not null default false,
  add column if not exists duration_min numeric,
  add column if not exists live_broadcast_content text,
  add column if not exists metadata jsonb,
  add column if not exists cache_refreshed_at timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'videos'
      and column_name = 'scheduled_start_time'
  ) then
    execute '
      update videos
      set scheduled_start_at = coalesce(scheduled_start_at, scheduled_start_time)
      where scheduled_start_at is null
    ';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'videos'
      and column_name = 'kind'
  ) then
    execute '
      update videos
      set video_type = coalesce(video_type, case when kind = ''upcoming'' then ''upcoming'' else ''vod'' end)
      where video_type is null
    ';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'videos'
      and column_name = 'raw'
  ) then
    execute '
      update videos
      set metadata = coalesce(metadata, raw)
      where metadata is null
    ';
  end if;
end $$;

update videos
set
  video_type = coalesce(video_type, 'vod'),
  channel_name = coalesce(channel_name, 'Neznámý kanál'),
  live_broadcast_content = coalesce(live_broadcast_content, 'none'),
  duration_min = coalesce(duration_min, 30),
  cache_refreshed_at = coalesce(cache_refreshed_at, now());

create index if not exists videos_scheduled_start_at_idx on videos (scheduled_start_at desc);
create index if not exists videos_video_type_idx on videos (video_type);
create index if not exists videos_live_broadcast_content_idx on videos (live_broadcast_content);
create index if not exists videos_cache_refreshed_at_idx on videos (cache_refreshed_at desc);
