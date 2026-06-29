-- Noviny MVP (izolovaná vrstva)
-- POZN.: V projektu už existuje tabulka `news_sources` pro Jasné zprávy.
-- Proto používáme prefix `noviny_*`, aby nedošlo ke kolizi ani regresi.

create table if not exists noviny_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists noviny_sources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  homepage_url text,
  rss_url text not null unique,
  language text default 'cs',
  country text,
  category_id uuid references noviny_categories(id) on delete set null,
  is_active boolean not null default true,
  allow_images boolean not null default false,
  legal_note text,
  last_fetched_at timestamptz,
  last_success_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists noviny_articles (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references noviny_sources(id) on delete cascade,
  category_id uuid references noviny_categories(id) on delete set null,
  source_article_id text,
  title text not null,
  perex text,
  original_url text not null,
  canonical_url text not null,
  published_at timestamptz,
  image_url text,
  image_usage_safe boolean not null default false,
  external_author text,
  language text,
  is_hidden boolean not null default false,
  edited_title text,
  edited_perex text,
  metadata jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists noviny_articles_canonical_url_unique
  on noviny_articles (canonical_url);

create unique index if not exists noviny_articles_source_article_id_unique
  on noviny_articles (source_id, source_article_id)
  where source_article_id is not null;

create index if not exists noviny_articles_source_idx
  on noviny_articles (source_id);

create index if not exists noviny_articles_published_idx
  on noviny_articles (published_at desc);

create index if not exists noviny_articles_category_idx
  on noviny_articles (category_id);

create table if not exists noviny_tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists noviny_article_tags (
  article_id uuid not null references noviny_articles(id) on delete cascade,
  tag_id uuid not null references noviny_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (article_id, tag_id)
);

create table if not exists noviny_fetch_logs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references noviny_sources(id) on delete set null,
  run_type text not null default 'manual' check (run_type in ('cron', 'manual', 'api')),
  status text not null check (status in ('success', 'warning', 'error')),
  fetched_at timestamptz not null default now(),
  http_status integer,
  imported_count integer not null default 0,
  deduplicated_count integer not null default 0,
  skipped_count integer not null default 0,
  duration_ms integer,
  message text,
  error_detail text,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists noviny_fetch_logs_source_idx
  on noviny_fetch_logs (source_id, fetched_at desc);

create table if not exists noviny_syndication (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references noviny_articles(id) on delete cascade,
  provider text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  external_id text,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (article_id, provider)
);

create or replace function noviny_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists noviny_sources_set_updated_at_trigger on noviny_sources;
create trigger noviny_sources_set_updated_at_trigger
before update on noviny_sources
for each row execute function noviny_set_updated_at();

drop trigger if exists noviny_articles_set_updated_at_trigger on noviny_articles;
create trigger noviny_articles_set_updated_at_trigger
before update on noviny_articles
for each row execute function noviny_set_updated_at();

drop trigger if exists noviny_syndication_set_updated_at_trigger on noviny_syndication;
create trigger noviny_syndication_set_updated_at_trigger
before update on noviny_syndication
for each row execute function noviny_set_updated_at();

-- RLS: veřejný web může jen číst publikované/aktivní záznamy.
alter table noviny_categories enable row level security;
alter table noviny_sources enable row level security;
alter table noviny_articles enable row level security;
alter table noviny_tags enable row level security;
alter table noviny_article_tags enable row level security;
alter table noviny_fetch_logs enable row level security;
alter table noviny_syndication enable row level security;

drop policy if exists "anon read noviny categories" on noviny_categories;
create policy "anon read noviny categories"
  on noviny_categories for select
  to anon, authenticated
  using (true);

drop policy if exists "anon read active noviny sources" on noviny_sources;
create policy "anon read active noviny sources"
  on noviny_sources for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "anon read noviny articles" on noviny_articles;
create policy "anon read noviny articles"
  on noviny_articles for select
  to anon, authenticated
  using (
    is_hidden = false
    and published_at is not null
    and exists (
      select 1 from noviny_sources s
      where s.id = noviny_articles.source_id
        and s.is_active = true
    )
  );

drop policy if exists "anon read noviny tags" on noviny_tags;
create policy "anon read noviny tags"
  on noviny_tags for select
  to anon, authenticated
  using (true);

drop policy if exists "anon read noviny article tags" on noviny_article_tags;
create policy "anon read noviny article tags"
  on noviny_article_tags for select
  to anon, authenticated
  using (
    exists (
      select 1 from noviny_articles a
      join noviny_sources s on s.id = a.source_id
      where a.id = noviny_article_tags.article_id
        and a.is_hidden = false
        and a.published_at is not null
        and s.is_active = true
    )
  );

grant usage on schema public to anon, authenticated;
grant select on noviny_categories, noviny_sources, noviny_articles, noviny_tags, noviny_article_tags
  to anon, authenticated;

insert into noviny_categories (slug, name, description)
values
  ('domaci', 'Domácí', 'Události z Česka'),
  ('zahranici', 'Zahraničí', 'Dění ve světě'),
  ('ekonomika', 'Ekonomika', 'Finance, trhy a hospodářství'),
  ('technologie', 'Technologie', 'Technologie, AI a inovace'),
  ('spolecnost', 'Společnost', 'Společenská témata')
on conflict (slug) do nothing;
