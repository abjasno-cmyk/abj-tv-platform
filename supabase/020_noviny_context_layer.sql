-- Noviny Kontext Layer 2.0
-- Izolovaná znalostní vrstva nad články. RSS import na ní nezávisí.

create table if not exists noviny_entities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  entity_type text not null check (entity_type in ('person', 'institution', 'country', 'place', 'organization', 'other')),
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists noviny_topics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  is_long_term boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists noviny_events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  starts_at timestamptz,
  last_seen_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists noviny_article_context (
  article_id uuid primary key references noviny_articles(id) on delete cascade,
  status text not null default 'ok' check (status in ('ok', 'partial', 'failed')),
  content_type text not null default 'article',
  main_theme text,
  short_summary text,
  safe_attribution text,
  why_important text,
  verox_relevance integer not null default 0 check (verox_relevance between 0 and 100),
  suggested_tags text[] not null default '{}',
  analysis_version text not null default 'context-layer-2.0-mvp',
  analyzed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists noviny_article_entities (
  article_id uuid not null references noviny_articles(id) on delete cascade,
  entity_id uuid not null references noviny_entities(id) on delete cascade,
  relevance numeric not null default 0.5,
  evidence text,
  created_at timestamptz not null default now(),
  primary key (article_id, entity_id)
);

create table if not exists noviny_article_topics (
  article_id uuid not null references noviny_articles(id) on delete cascade,
  topic_id uuid not null references noviny_topics(id) on delete cascade,
  relevance numeric not null default 0.5,
  evidence text,
  created_at timestamptz not null default now(),
  primary key (article_id, topic_id)
);

create table if not exists noviny_article_events (
  article_id uuid not null references noviny_articles(id) on delete cascade,
  event_id uuid not null references noviny_events(id) on delete cascade,
  relevance numeric not null default 0.5,
  evidence text,
  created_at timestamptz not null default now(),
  primary key (article_id, event_id)
);

drop trigger if exists noviny_entities_set_updated_at_trigger on noviny_entities;
create trigger noviny_entities_set_updated_at_trigger
before update on noviny_entities
for each row execute function noviny_set_updated_at();

drop trigger if exists noviny_topics_set_updated_at_trigger on noviny_topics;
create trigger noviny_topics_set_updated_at_trigger
before update on noviny_topics
for each row execute function noviny_set_updated_at();

drop trigger if exists noviny_events_set_updated_at_trigger on noviny_events;
create trigger noviny_events_set_updated_at_trigger
before update on noviny_events
for each row execute function noviny_set_updated_at();

alter table noviny_entities enable row level security;
alter table noviny_topics enable row level security;
alter table noviny_events enable row level security;
alter table noviny_article_context enable row level security;
alter table noviny_article_entities enable row level security;
alter table noviny_article_topics enable row level security;
alter table noviny_article_events enable row level security;

drop policy if exists "anon read noviny entities" on noviny_entities;
create policy "anon read noviny entities"
  on noviny_entities for select to anon, authenticated
  using (true);

drop policy if exists "anon read noviny topics" on noviny_topics;
create policy "anon read noviny topics"
  on noviny_topics for select to anon, authenticated
  using (true);

drop policy if exists "anon read noviny events" on noviny_events;
create policy "anon read noviny events"
  on noviny_events for select to anon, authenticated
  using (true);

drop policy if exists "anon read visible article context" on noviny_article_context;
create policy "anon read visible article context"
  on noviny_article_context for select to anon, authenticated
  using (
    exists (
      select 1
      from noviny_articles a
      join noviny_sources s on s.id = a.source_id
      where a.id = noviny_article_context.article_id
        and a.is_hidden = false
        and a.published_at is not null
        and s.is_active = true
    )
  );

drop policy if exists "anon read visible article entity links" on noviny_article_entities;
create policy "anon read visible article entity links"
  on noviny_article_entities for select to anon, authenticated
  using (
    exists (
      select 1
      from noviny_articles a
      join noviny_sources s on s.id = a.source_id
      where a.id = noviny_article_entities.article_id
        and a.is_hidden = false
        and a.published_at is not null
        and s.is_active = true
    )
  );

drop policy if exists "anon read visible article topic links" on noviny_article_topics;
create policy "anon read visible article topic links"
  on noviny_article_topics for select to anon, authenticated
  using (
    exists (
      select 1
      from noviny_articles a
      join noviny_sources s on s.id = a.source_id
      where a.id = noviny_article_topics.article_id
        and a.is_hidden = false
        and a.published_at is not null
        and s.is_active = true
    )
  );

drop policy if exists "anon read visible article event links" on noviny_article_events;
create policy "anon read visible article event links"
  on noviny_article_events for select to anon, authenticated
  using (
    exists (
      select 1
      from noviny_articles a
      join noviny_sources s on s.id = a.source_id
      where a.id = noviny_article_events.article_id
        and a.is_hidden = false
        and a.published_at is not null
        and s.is_active = true
    )
  );

grant select on
  noviny_entities,
  noviny_topics,
  noviny_events,
  noviny_article_context,
  noviny_article_entities,
  noviny_article_topics,
  noviny_article_events
to anon, authenticated;

create index if not exists noviny_article_topics_topic_idx on noviny_article_topics(topic_id, relevance desc);
create index if not exists noviny_article_entities_entity_idx on noviny_article_entities(entity_id, relevance desc);
create index if not exists noviny_article_events_event_idx on noviny_article_events(event_id, relevance desc);
