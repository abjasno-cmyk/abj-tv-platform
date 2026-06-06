-- Uložené články Názorů (stejný vzor jako saved_videos).

create table if not exists saved_opinion_articles (
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id uuid not null references opinion_articles(id) on delete cascade,
  title text not null default '',
  slug text not null default '',
  hero_image_path text,
  author_name text,
  created_at timestamptz not null default now(),
  primary key (user_id, article_id)
);

create index if not exists saved_opinion_articles_user_created_idx
  on saved_opinion_articles(user_id, created_at desc);

alter table saved_opinion_articles enable row level security;

drop policy if exists "saved opinion articles own" on saved_opinion_articles;
create policy "saved opinion articles own"
  on saved_opinion_articles
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, delete on saved_opinion_articles to authenticated;
