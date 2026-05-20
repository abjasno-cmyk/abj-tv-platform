-- Lock VEROX Studio to one Google account only.

create or replace function is_studio_allowlisted_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'abjasno@gmail.com'
    and lower(coalesce((auth.jwt() -> 'app_metadata' ->> 'provider'), '')) = 'google';
$$;

-- Ensure the approved account has owner role if profile exists.
update profiles
set role = 'owner'
where lower(coalesce(email, '')) = 'abjasno@gmail.com';

insert into admin_roles (user_id, role, created_by)
select p.id, 'owner', null
from profiles p
where lower(coalesce(p.email, '')) = 'abjasno@gmail.com'
on conflict (user_id, role) do nothing;

-- Remove explicit studio roles from any other account (defense in depth).
delete from admin_roles
where user_id in (
  select p.id
  from profiles p
  where lower(coalesce(p.email, '')) <> 'abjasno@gmail.com'
)
and role in ('moderator', 'editor', 'senior_editor', 'analyst', 'admin', 'owner');
