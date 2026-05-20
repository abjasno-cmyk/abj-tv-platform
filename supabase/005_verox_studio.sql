-- VEROX Studio / Control Room
-- Internal operational layer over existing automation.

create extension if not exists "pgcrypto";

-- Extend profile roles without breaking existing viewer auth.
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
    check (role in ('viewer', 'moderator', 'editor', 'senior_editor', 'analyst', 'admin', 'owner'));
exception
  when duplicate_object then null;
  when undefined_table then null;
end $$;

create table if not exists admin_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('moderator', 'editor', 'senior_editor', 'analyst', 'admin', 'owner')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  primary key (user_id, role)
);

create table if not exists editorial_items (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('news', 'jasne_zpravy', 'breaking', 'program_note', 'homepage_banner')),
  status text not null default 'manual_draft'
    check (status in ('generated', 'auto_published', 'edited_after_publish', 'manual_draft', 'manual_published', 'withdrawn', 'superseded', 'error', 'archived')),
  title text not null,
  slug text,
  summary text,
  body text,
  source_payload jsonb not null default '{}'::jsonb,
  original_payload jsonb not null default '{}'::jsonb,
  current_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  priority integer not null default 0,
  auto_generated boolean not null default false,
  auto_published boolean not null default false,
  manual_override boolean not null default false,
  published_at timestamptz,
  expires_at timestamptz,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists editorial_revisions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references editorial_items(id) on delete cascade,
  changed_by uuid references auth.users(id),
  change_type text not null,
  old_value jsonb,
  new_value jsonb,
  change_note text,
  created_at timestamptz not null default now()
);

create table if not exists breaking_news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  short_text text,
  body text,
  priority integer not null default 0,
  show_on_homepage boolean not null default false,
  show_as_top_banner boolean not null default false,
  show_in_news_section boolean not null default true,
  include_in_next_jasne_zpravy boolean not null default false,
  insert_into_broadcast boolean not null default false,
  valid_from timestamptz,
  valid_to timestamptz,
  status text not null default 'draft'
    check (status in ('draft', 'ready', 'published', 'expired', 'withdrawn')),
  created_by uuid references auth.users(id),
  published_by uuid references auth.users(id),
  withdrawn_by uuid references auth.users(id),
  published_at timestamptz,
  withdrawn_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists broadcast_schedule_overrides (
  id uuid primary key default gen_random_uuid(),
  target_schedule_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  content_type text not null,
  content_id text,
  title text,
  action text not null check (action in ('insert_block', 'replace_block', 'skip_block', 'lock_block', 'force_video', 'ban_video_from_broadcast', 'return_to_auto')),
  status text not null default 'active',
  reason text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  anonymous_id text,
  session_id text,
  event_name text not null,
  entity_type text,
  entity_id text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid references auth.users(id),
  target_user_id uuid references auth.users(id),
  target_type text,
  target_id text,
  action text not null,
  reason text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  old_value jsonb,
  new_value jsonb,
  reason text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists admin_roles_user_idx on admin_roles (user_id);
create index if not exists admin_roles_role_idx on admin_roles (role);

create index if not exists editorial_items_status_published_idx on editorial_items (status, published_at desc);
create index if not exists editorial_items_type_status_idx on editorial_items (type, status);
create index if not exists editorial_items_slug_idx on editorial_items (slug);
create index if not exists editorial_revisions_item_created_idx on editorial_revisions (item_id, created_at desc);

create index if not exists breaking_news_status_valid_idx on breaking_news (status, valid_from, valid_to);
create index if not exists breaking_news_published_idx on breaking_news (published_at desc);

create index if not exists broadcast_overrides_status_starts_idx on broadcast_schedule_overrides (status, starts_at);
create index if not exists broadcast_overrides_action_created_idx on broadcast_schedule_overrides (action, created_at desc);

create index if not exists analytics_events_created_idx on analytics_events (created_at desc);
create index if not exists analytics_events_event_created_idx on analytics_events (event_name, created_at desc);
create index if not exists analytics_events_entity_idx on analytics_events (entity_type, entity_id, created_at desc);
create index if not exists analytics_events_user_idx on analytics_events (user_id, created_at desc);
create index if not exists analytics_events_session_idx on analytics_events (session_id, created_at desc);

create index if not exists moderation_actions_moderator_created_idx on moderation_actions (moderator_id, created_at desc);
create index if not exists moderation_actions_target_idx on moderation_actions (target_type, target_id, created_at desc);

create index if not exists audit_log_created_idx on audit_log (created_at desc);
create index if not exists audit_log_actor_created_idx on audit_log (actor_id, created_at desc);
create index if not exists audit_log_entity_created_idx on audit_log (entity_type, entity_id, created_at desc);

create or replace function studio_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists editorial_items_set_updated_at_trigger on editorial_items;
create trigger editorial_items_set_updated_at_trigger
before update on editorial_items
for each row execute function studio_set_updated_at();

drop trigger if exists breaking_news_set_updated_at_trigger on breaking_news;
create trigger breaking_news_set_updated_at_trigger
before update on breaking_news
for each row execute function studio_set_updated_at();

create or replace function is_studio_allowlisted_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) in ('jana.bobosikova@verox.cz', 'hana.lipovska@verox.cz');
$$;

create or replace function current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.role from profiles p where p.id = auth.uid() limit 1), 'viewer');
$$;

create or replace function current_user_has_admin_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from admin_roles ar
    where ar.user_id = auth.uid()
      and ar.role = any(required_roles)
  );
$$;

create or replace function current_user_has_studio_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    current_profile_role() = any(required_roles)
    or current_user_has_admin_role(required_roles);
$$;

create or replace function can_access_studio()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    is_studio_allowlisted_user()
    and current_user_has_studio_role(array['moderator', 'editor', 'senior_editor', 'analyst', 'admin', 'owner']);
$$;

alter table admin_roles enable row level security;
alter table editorial_items enable row level security;
alter table editorial_revisions enable row level security;
alter table breaking_news enable row level security;
alter table broadcast_schedule_overrides enable row level security;
alter table analytics_events enable row level security;
alter table moderation_actions enable row level security;
alter table audit_log enable row level security;

drop policy if exists "admin_roles select own_or_admin" on admin_roles;
create policy "admin_roles select own_or_admin"
  on admin_roles
  for select
  to authenticated
  using (auth.uid() = user_id or (is_studio_allowlisted_user() and current_user_has_studio_role(array['admin', 'owner'])));

drop policy if exists "admin_roles manage admin_owner" on admin_roles;
create policy "admin_roles manage admin_owner"
  on admin_roles
  for all
  to authenticated
  using (is_studio_allowlisted_user() and current_user_has_studio_role(array['admin', 'owner']))
  with check (is_studio_allowlisted_user() and current_user_has_studio_role(array['admin', 'owner']));

drop policy if exists "editorial_items select studio" on editorial_items;
create policy "editorial_items select studio"
  on editorial_items
  for select
  to authenticated
  using (can_access_studio());

drop policy if exists "editorial_items insert editors" on editorial_items;
create policy "editorial_items insert editors"
  on editorial_items
  for insert
  to authenticated
  with check (can_access_studio() and current_user_has_studio_role(array['editor', 'senior_editor', 'admin', 'owner']));

drop policy if exists "editorial_items update editors" on editorial_items;
create policy "editorial_items update editors"
  on editorial_items
  for update
  to authenticated
  using (can_access_studio() and current_user_has_studio_role(array['editor', 'senior_editor', 'admin', 'owner']))
  with check (can_access_studio() and current_user_has_studio_role(array['editor', 'senior_editor', 'admin', 'owner']));

drop policy if exists "editorial_items delete admin_owner" on editorial_items;
create policy "editorial_items delete admin_owner"
  on editorial_items
  for delete
  to authenticated
  using (can_access_studio() and current_user_has_studio_role(array['admin', 'owner']));

drop policy if exists "editorial_revisions select studio" on editorial_revisions;
create policy "editorial_revisions select studio"
  on editorial_revisions
  for select
  to authenticated
  using (can_access_studio());

drop policy if exists "editorial_revisions insert editors" on editorial_revisions;
create policy "editorial_revisions insert editors"
  on editorial_revisions
  for insert
  to authenticated
  with check (can_access_studio() and current_user_has_studio_role(array['editor', 'senior_editor', 'admin', 'owner']));

drop policy if exists "breaking_news select studio" on breaking_news;
create policy "breaking_news select studio"
  on breaking_news
  for select
  to authenticated
  using (can_access_studio());

drop policy if exists "breaking_news insert editors" on breaking_news;
create policy "breaking_news insert editors"
  on breaking_news
  for insert
  to authenticated
  with check (can_access_studio() and current_user_has_studio_role(array['editor', 'senior_editor', 'admin', 'owner']));

drop policy if exists "breaking_news update senior_admin" on breaking_news;
create policy "breaking_news update senior_admin"
  on breaking_news
  for update
  to authenticated
  using (can_access_studio() and current_user_has_studio_role(array['senior_editor', 'admin', 'owner']))
  with check (can_access_studio() and current_user_has_studio_role(array['senior_editor', 'admin', 'owner']));

drop policy if exists "breaking_news delete admin_owner" on breaking_news;
create policy "breaking_news delete admin_owner"
  on breaking_news
  for delete
  to authenticated
  using (can_access_studio() and current_user_has_studio_role(array['admin', 'owner']));

drop policy if exists "broadcast_overrides select studio" on broadcast_schedule_overrides;
create policy "broadcast_overrides select studio"
  on broadcast_schedule_overrides
  for select
  to authenticated
  using (can_access_studio());

drop policy if exists "broadcast_overrides manage senior_admin" on broadcast_schedule_overrides;
create policy "broadcast_overrides manage senior_admin"
  on broadcast_schedule_overrides
  for all
  to authenticated
  using (can_access_studio() and current_user_has_studio_role(array['senior_editor', 'admin', 'owner']))
  with check (can_access_studio() and current_user_has_studio_role(array['senior_editor', 'admin', 'owner']));

drop policy if exists "analytics_events insert anon" on analytics_events;
create policy "analytics_events insert anon"
  on analytics_events
  for insert
  to anon, authenticated
  with check (
    user_id is null
    or auth.uid() = user_id
  );

drop policy if exists "analytics_events select analysts" on analytics_events;
create policy "analytics_events select analysts"
  on analytics_events
  for select
  to authenticated
  using (can_access_studio() and current_user_has_studio_role(array['analyst', 'admin', 'owner']));

drop policy if exists "moderation_actions select moderation_team" on moderation_actions;
create policy "moderation_actions select moderation_team"
  on moderation_actions
  for select
  to authenticated
  using (can_access_studio() and current_user_has_studio_role(array['moderator', 'senior_editor', 'admin', 'owner']));

drop policy if exists "moderation_actions insert moderation_team" on moderation_actions;
create policy "moderation_actions insert moderation_team"
  on moderation_actions
  for insert
  to authenticated
  with check (can_access_studio() and current_user_has_studio_role(array['moderator', 'senior_editor', 'admin', 'owner']));

drop policy if exists "audit_log select internal" on audit_log;
create policy "audit_log select internal"
  on audit_log
  for select
  to authenticated
  using (can_access_studio() and current_user_has_studio_role(array['senior_editor', 'analyst', 'admin', 'owner']));

drop policy if exists "audit_log insert internal" on audit_log;
create policy "audit_log insert internal"
  on audit_log
  for insert
  to authenticated
  with check (
    can_access_studio()
    and current_user_has_studio_role(array['moderator', 'editor', 'senior_editor', 'analyst', 'admin', 'owner'])
    and (actor_id is null or actor_id = auth.uid())
  );

grant select, insert, update, delete on admin_roles to authenticated;
grant select, insert, update, delete on editorial_items to authenticated;
grant select, insert on editorial_revisions to authenticated;
grant select, insert, update, delete on breaking_news to authenticated;
grant select, insert, update, delete on broadcast_schedule_overrides to authenticated;
grant insert on analytics_events to anon;
grant select, insert on analytics_events to authenticated;
grant select, insert on moderation_actions to authenticated;
grant select, insert on audit_log to authenticated;
