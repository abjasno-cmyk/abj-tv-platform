-- Comment engagement: in-app notifications for likes and replies on viewer comments.

create table if not exists user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('comment_liked', 'comment_replied')),
  actor_user_id uuid references auth.users(id) on delete set null,
  comment_id uuid not null references comments(id) on delete cascade,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_notifications_user_created_idx
  on user_notifications (user_id, created_at desc);

create index if not exists user_notifications_user_unread_idx
  on user_notifications (user_id, read_at, created_at desc);

alter table user_notifications enable row level security;

drop policy if exists "user notifications select own" on user_notifications;
create policy "user notifications select own"
  on user_notifications
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user notifications update own" on user_notifications;
create policy "user notifications update own"
  on user_notifications
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
