create extension if not exists "pgcrypto";

create table if not exists wall_posts (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  author_email text null,
  body text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'hidden', 'flagged')),
  video_id text null,
  parent_id uuid null references wall_posts(id) on delete cascade,
  likes_count integer not null default 0,
  reports_count integer not null default 0,
  ip_hash text null,
  user_agent_hash text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz null,
  approved_by text null
);

create table if not exists wall_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references wall_posts(id) on delete cascade,
  reaction_type text not null default 'like',
  session_hash text not null,
  created_at timestamptz not null default now(),
  unique(post_id, session_hash, reaction_type)
);

create table if not exists wall_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references wall_posts(id) on delete cascade,
  reason text null,
  session_hash text null,
  created_at timestamptz not null default now()
);

create table if not exists wall_moderation_log (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references wall_posts(id) on delete cascade,
  action text not null,
  reason text null,
  moderator text null,
  created_at timestamptz not null default now()
);

create index if not exists wall_posts_status_created_at_idx on wall_posts(status, created_at desc);
create index if not exists wall_posts_video_status_created_at_idx on wall_posts(video_id, status, created_at desc);
create index if not exists wall_posts_parent_id_idx on wall_posts(parent_id);
create index if not exists wall_reactions_post_id_idx on wall_reactions(post_id);
create index if not exists wall_reports_post_id_idx on wall_reports(post_id);

create or replace function wall_posts_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists wall_posts_set_updated_at_trigger on wall_posts;
create trigger wall_posts_set_updated_at_trigger
before update on wall_posts
for each row execute function wall_posts_set_updated_at();

