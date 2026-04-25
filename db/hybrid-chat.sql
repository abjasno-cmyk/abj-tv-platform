create extension if not exists "pgcrypto";

do $$ begin
  create type channel_type as enum ('OWNED_ABJ', 'EXTERNAL');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type message_type as enum ('CHAT', 'QUESTION');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type message_status as enum ('PENDING', 'ANSWERED', 'SENT_TO_YT');
exception
  when duplicate_object then null;
end $$;

create table if not exists hybrid_streams (
  id text primary key,
  title text not null,
  youtube_live_id text not null,
  is_active boolean not null default false,
  channel_type channel_type not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hybrid_streams_is_active_idx on hybrid_streams (is_active);
create index if not exists hybrid_streams_channel_type_idx on hybrid_streams (channel_type);

create table if not exists hybrid_messages (
  id text primary key,
  user_id uuid not null references auth.users(id),
  stream_id text not null references hybrid_streams(id) on delete cascade,
  content text not null,
  type message_type not null,
  parent_id text references hybrid_messages(id) on delete set null,
  status message_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hybrid_messages_stream_type_created_idx
  on hybrid_messages (stream_id, type, created_at desc);
create index if not exists hybrid_messages_parent_idx on hybrid_messages (parent_id);
create index if not exists hybrid_messages_status_idx on hybrid_messages (status);

create table if not exists hybrid_likes (
  id text primary key,
  user_id uuid not null references auth.users(id),
  message_id text not null references hybrid_messages(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, message_id)
);

create index if not exists hybrid_likes_message_idx on hybrid_likes (message_id);

create table if not exists hybrid_upvotes (
  id text primary key,
  user_id uuid not null references auth.users(id),
  message_id text not null references hybrid_messages(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, message_id)
);

create index if not exists hybrid_upvotes_message_idx on hybrid_upvotes (message_id);

alter table hybrid_streams enable row level security;
alter table hybrid_messages enable row level security;
alter table hybrid_likes enable row level security;
alter table hybrid_upvotes enable row level security;

do $$ begin
  create policy "hybrid_streams_read_all" on hybrid_streams
    for select using (true);
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create policy "hybrid_messages_read_all" on hybrid_messages
    for select using (true);
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create policy "hybrid_messages_insert_authenticated" on hybrid_messages
    for insert to authenticated with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create policy "hybrid_likes_read_all" on hybrid_likes
    for select using (true);
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create policy "hybrid_likes_insert_authenticated" on hybrid_likes
    for insert to authenticated with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create policy "hybrid_likes_delete_owner" on hybrid_likes
    for delete to authenticated using (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create policy "hybrid_upvotes_read_all" on hybrid_upvotes
    for select using (true);
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create policy "hybrid_upvotes_insert_authenticated" on hybrid_upvotes
    for insert to authenticated with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create policy "hybrid_upvotes_delete_owner" on hybrid_upvotes
    for delete to authenticated using (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;
