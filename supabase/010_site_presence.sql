-- Real-time site presence for hero audience counter (heartbeat + TTL cleanup in API).

create table if not exists site_presence (
  session_id text primary key,
  last_seen_at timestamptz not null default now(),
  page_path text
);

create index if not exists site_presence_last_seen_idx on site_presence (last_seen_at desc);

alter table site_presence enable row level security;

-- No public policies: reads/writes go through server API with service role only.
