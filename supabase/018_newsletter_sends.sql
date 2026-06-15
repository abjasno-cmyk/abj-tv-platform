-- Daily newsletter send log (idempotent per user per Prague calendar day).

create table if not exists newsletter_send_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  edition_date date not null,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  provider_message_id text,
  error text,
  created_at timestamptz not null default now(),
  unique (user_id, edition_date)
);

create index if not exists newsletter_send_log_edition_idx
  on newsletter_send_log (edition_date, status, created_at desc);

alter table newsletter_send_log enable row level security;
