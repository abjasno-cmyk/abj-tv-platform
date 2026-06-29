-- Uložené články Novin (odděleně od Názorů i videí).

create table if not exists saved_noviny_articles (
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id uuid not null references noviny_articles(id) on delete cascade,
  title text not null default '',
  source_name text,
  original_url text not null default '',
  image_url text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, article_id)
);

create index if not exists saved_noviny_articles_user_created_idx
  on saved_noviny_articles(user_id, created_at desc);

alter table saved_noviny_articles enable row level security;

drop policy if exists "saved noviny articles own" on saved_noviny_articles;
create policy "saved noviny articles own"
  on saved_noviny_articles
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, delete on saved_noviny_articles to authenticated;
