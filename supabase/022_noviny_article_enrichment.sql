-- Noviny article enrichment.
-- Izolovaná vrstva pro interní analýzu článků bez ukládání celého extrahovaného textu.

alter table noviny_sources
  add column if not exists enrichment_enabled boolean not null default true,
  add column if not exists enrichment_mode text not null default 'automatic'
    check (enrichment_mode in ('off', 'manual', 'automatic')),
  add column if not exists fetch_delay_seconds integer not null default 45
    check (fetch_delay_seconds between 30 and 3600),
  add column if not exists max_articles_per_day integer not null default 50
    check (max_articles_per_day between 0 and 500),
  add column if not exists respect_robots boolean not null default true,
  add column if not exists enrichment_notes text;

create table if not exists noviny_article_enrichment (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references noviny_articles(id) on delete cascade,
  source_id uuid not null references noviny_sources(id) on delete cascade,
  fetch_status text not null default 'pending'
    check (fetch_status in ('pending', 'fetched', 'blocked', 'failed', 'paywalled', 'skipped')),
  fetched_at timestamptz,
  extracted_text_hash text,
  extracted_text_length integer not null default 0 check (extracted_text_length >= 0),
  extraction_method text,
  internal_debug_excerpt text check (internal_debug_excerpt is null or char_length(internal_debug_excerpt) <= 500),
  ai_summary_5_points text[] not null default '{}',
  ai_why_it_matters text,
  ai_entities jsonb not null default '[]'::jsonb,
  ai_topics text[] not null default '{}',
  ai_content_type text,
  ai_relevance_score integer check (ai_relevance_score is null or ai_relevance_score between 0 and 100),
  ai_risk_score integer check (ai_risk_score is null or ai_risk_score between 0 and 100),
  ai_status text not null default 'pending'
    check (ai_status in ('pending', 'generated', 'approved', 'rejected')),
  error_message text,
  retry_count integer not null default 0 check (retry_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(article_id)
);

drop trigger if exists noviny_article_enrichment_set_updated_at_trigger on noviny_article_enrichment;
create trigger noviny_article_enrichment_set_updated_at_trigger
before update on noviny_article_enrichment
for each row execute function noviny_set_updated_at();

alter table noviny_article_enrichment enable row level security;

drop policy if exists "anon read approved visible noviny enrichment" on noviny_article_enrichment;
create policy "anon read approved visible noviny enrichment"
  on noviny_article_enrichment for select to anon, authenticated
  using (
    ai_status = 'approved'
    and exists (
      select 1
      from noviny_articles a
      join noviny_sources s on s.id = a.source_id
      where a.id = noviny_article_enrichment.article_id
        and a.is_hidden = false
        and a.published_at is not null
        and s.is_active = true
    )
  );

grant select on noviny_article_enrichment to anon, authenticated;

create index if not exists noviny_article_enrichment_source_status_idx
  on noviny_article_enrichment(source_id, fetch_status, created_at asc);

create index if not exists noviny_article_enrichment_ai_status_idx
  on noviny_article_enrichment(ai_status, updated_at desc);

create index if not exists noviny_article_enrichment_source_fetched_idx
  on noviny_article_enrichment(source_id, fetched_at desc);
