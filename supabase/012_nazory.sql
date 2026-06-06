-- Názory: autorské články, autorské profily, role author.
-- Run in Supabase SQL editor after prior viewer migrations.

create extension if not exists "pgcrypto";

-- Extend profile roles with "author" without removing studio roles.
do $$
begin
  begin
    alter table profiles drop constraint if exists profiles_role_check;
  exception
    when undefined_table then null;
  end;
end $$;

do $$
begin
  alter table profiles
    add constraint profiles_role_check
    check (role in (
      'viewer',
      'author',
      'moderator',
      'editor',
      'senior_editor',
      'analyst',
      'admin',
      'owner'
    ));
exception
  when duplicate_object then null;
  when undefined_table then null;
end $$;

create table if not exists author_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  slug text not null,
  bio text,
  title text,
  profession text,
  city text,
  website_url text,
  facebook_url text,
  x_url text,
  linkedin_url text,
  contact_email text,
  avatar_storage_path text,
  is_active boolean not null default true,
  profile_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint author_profiles_slug_unique unique (slug),
  constraint author_profiles_bio_length check (bio is null or char_length(bio) <= 500)
);

create table if not exists opinion_articles (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references author_profiles(user_id) on delete cascade,
  slug text not null,
  title text not null default '',
  perex text not null default '',
  hero_image_path text,
  content_json jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  deleted_at timestamptz,
  reading_time_min integer,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opinion_articles_slug_unique unique (slug),
  constraint opinion_articles_perex_length check (char_length(perex) <= 300)
);

create index if not exists author_profiles_slug_idx on author_profiles(slug);
create index if not exists author_profiles_active_idx on author_profiles(is_active, profile_completed);
create index if not exists opinion_articles_status_published_idx
  on opinion_articles(status, published_at desc)
  where deleted_at is null;
create index if not exists opinion_articles_author_status_idx
  on opinion_articles(author_id, status, updated_at desc)
  where deleted_at is null;
create index if not exists opinion_articles_slug_idx on opinion_articles(slug);

drop trigger if exists author_profiles_set_updated_at_trigger on author_profiles;
create trigger author_profiles_set_updated_at_trigger
before update on author_profiles
for each row execute function viewer_set_updated_at();

drop trigger if exists opinion_articles_set_updated_at_trigger on opinion_articles;
create trigger opinion_articles_set_updated_at_trigger
before update on opinion_articles
for each row execute function viewer_set_updated_at();

create or replace function is_nazory_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from profiles p
    where p.id = auth.uid()
      and (
        lower(coalesce(p.email, '')) = 'abjasno@gmail.com'
        or p.role in ('admin', 'owner', 'moderator')
      )
  );
$$;

create or replace function is_active_nazory_author()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from author_profiles ap
    join profiles p on p.id = ap.user_id
    where ap.user_id = auth.uid()
      and ap.is_active = true
      and p.role = 'author'
  );
$$;

alter table author_profiles enable row level security;
alter table opinion_articles enable row level security;

drop policy if exists "author profiles public read" on author_profiles;
create policy "author profiles public read"
  on author_profiles
  for select
  to anon, authenticated
  using (is_active = true and profile_completed = true);

drop policy if exists "author profiles own read" on author_profiles;
create policy "author profiles own read"
  on author_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "author profiles admin read" on author_profiles;
create policy "author profiles admin read"
  on author_profiles
  for select
  to authenticated
  using (is_nazory_admin());

drop policy if exists "author profiles own update" on author_profiles;
create policy "author profiles own update"
  on author_profiles
  for update
  to authenticated
  using (auth.uid() = user_id and is_active = true)
  with check (auth.uid() = user_id and is_active = true);

drop policy if exists "author profiles admin manage" on author_profiles;
create policy "author profiles admin manage"
  on author_profiles
  for all
  to authenticated
  using (is_nazory_admin())
  with check (is_nazory_admin());

drop policy if exists "opinion articles public read" on opinion_articles;
create policy "opinion articles public read"
  on opinion_articles
  for select
  to anon, authenticated
  using (status = 'published' and deleted_at is null);

drop policy if exists "opinion articles author read" on opinion_articles;
create policy "opinion articles author read"
  on opinion_articles
  for select
  to authenticated
  using (author_id = auth.uid() and deleted_at is null);

drop policy if exists "opinion articles author insert" on opinion_articles;
create policy "opinion articles author insert"
  on opinion_articles
  for insert
  to authenticated
  with check (author_id = auth.uid() and is_active_nazory_author());

drop policy if exists "opinion articles author update" on opinion_articles;
create policy "opinion articles author update"
  on opinion_articles
  for update
  to authenticated
  using (author_id = auth.uid() and is_active_nazory_author())
  with check (author_id = auth.uid() and is_active_nazory_author());

drop policy if exists "opinion articles admin manage" on opinion_articles;
create policy "opinion articles admin manage"
  on opinion_articles
  for all
  to authenticated
  using (is_nazory_admin())
  with check (is_nazory_admin());

grant select on author_profiles to anon, authenticated;
grant insert, update on author_profiles to authenticated;
grant select on opinion_articles to anon, authenticated;
grant insert, update on opinion_articles to authenticated;
