-- Verox unified search layer.
-- Izolovaný index nad videi, přepisy, Zprávami a Názory.

create extension if not exists pg_trgm;
create extension if not exists vector;
create extension if not exists "pgcrypto";

create table if not exists verox_search_documents (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('video', 'video_transcript', 'zpravy', 'nazory')),
  source_table text not null,
  source_id text not null,
  source_url text not null,
  title text not null,
  excerpt text,
  body_text text not null default '',
  source_label text,
  thumbnail_url text,
  published_at timestamptz,
  importance_score integer not null default 50 check (importance_score between 0 and 100),
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  search_vector tsvector,
  indexed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(content_type, source_id)
);

create or replace function verox_search_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function verox_search_update_vector()
returns trigger
language plpgsql
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.excerpt, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.body_text, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(new.source_label, '')), 'D');
  new.indexed_at = now();
  return new;
end;
$$;

drop trigger if exists verox_search_documents_set_updated_at_trigger on verox_search_documents;
create trigger verox_search_documents_set_updated_at_trigger
before update on verox_search_documents
for each row execute function verox_search_set_updated_at();

drop trigger if exists verox_search_documents_vector_trigger on verox_search_documents;
create trigger verox_search_documents_vector_trigger
before insert or update of title, excerpt, body_text, source_label on verox_search_documents
for each row execute function verox_search_update_vector();

create index if not exists verox_search_documents_type_published_idx
  on verox_search_documents(content_type, published_at desc);

create index if not exists verox_search_documents_search_vector_idx
  on verox_search_documents using gin(search_vector);

create index if not exists verox_search_documents_title_trgm_idx
  on verox_search_documents using gin(lower(title) gin_trgm_ops);

create index if not exists verox_search_documents_excerpt_trgm_idx
  on verox_search_documents using gin(lower(coalesce(excerpt, '')) gin_trgm_ops);

create index if not exists verox_search_documents_embedding_idx
  on verox_search_documents using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

alter table verox_search_documents enable row level security;

drop policy if exists "anon read verox search documents" on verox_search_documents;
create policy "anon read verox search documents"
  on verox_search_documents for select to anon, authenticated
  using (true);

grant select on verox_search_documents to anon, authenticated;

create or replace function verox_hybrid_search(
  p_query text,
  p_query_embedding vector(1536) default null,
  p_limit integer default 20,
  p_content_types text[] default null
)
returns table (
  id uuid,
  content_type text,
  source_id text,
  source_url text,
  title text,
  excerpt text,
  source_label text,
  thumbnail_url text,
  published_at timestamptz,
  relevance_score double precision,
  fts_score double precision,
  fuzzy_score double precision,
  semantic_score double precision,
  recency_score double precision,
  importance_score integer
)
language sql
stable
as $$
  with params as (
    select
      nullif(trim(coalesce(p_query, '')), '') as q,
      plainto_tsquery('simple', coalesce(p_query, '')) as tsq
  ),
  scored as (
    select
      d.*,
      case
        when (select q from params) is null then 0
        else ts_rank_cd(d.search_vector, (select tsq from params))
      end as fts_score,
      case
        when (select q from params) is null then 0
        else greatest(
          similarity(lower(d.title), lower((select q from params))),
          similarity(lower(coalesce(d.excerpt, '')), lower((select q from params))),
          similarity(lower(coalesce(d.body_text, '')), lower((select q from params))) * 0.45
        )
      end as fuzzy_score,
      case
        when p_query_embedding is null or d.embedding is null then 0
        else greatest(0, 1 - (d.embedding <=> p_query_embedding))
      end as semantic_score,
      case
        when d.published_at is null then 0.15
        else 1 / (1 + greatest(0, extract(epoch from (now() - d.published_at)) / 86400) / 30)
      end as recency_score
    from verox_search_documents d
    where (p_content_types is null or d.content_type = any(p_content_types))
      and (
        (select q from params) is null
        or d.search_vector @@ (select tsq from params)
        or similarity(lower(d.title), lower((select q from params))) > 0.08
        or similarity(lower(coalesce(d.excerpt, '')), lower((select q from params))) > 0.08
        or (p_query_embedding is not null and d.embedding is not null and (1 - (d.embedding <=> p_query_embedding)) > 0.68)
      )
  )
  select
    scored.id,
    scored.content_type,
    scored.source_id,
    scored.source_url,
    scored.title,
    scored.excerpt,
    scored.source_label,
    scored.thumbnail_url,
    scored.published_at,
    (
      scored.fts_score * 0.42 +
      scored.fuzzy_score * 0.22 +
      scored.semantic_score * 0.26 +
      scored.recency_score * 0.06 +
      (scored.importance_score::double precision / 100) * 0.04
    ) as relevance_score,
    scored.fts_score,
    scored.fuzzy_score,
    scored.semantic_score,
    scored.recency_score,
    scored.importance_score
  from scored
  order by relevance_score desc, published_at desc nulls last
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

grant execute on function verox_hybrid_search(text, vector(1536), integer, text[]) to anon, authenticated;
