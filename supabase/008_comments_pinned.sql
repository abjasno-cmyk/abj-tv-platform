-- Viewer comments: pin + moderator delete for global video discussions.

alter table comments
  add column if not exists is_pinned boolean not null default false;

create index if not exists comments_video_pinned_created_idx
  on comments (entity_type, is_pinned desc, created_at desc)
  where entity_type = 'video';

drop policy if exists "comments moderator delete" on comments;
create policy "comments moderator delete"
  on comments
  for delete
  to authenticated
  using (is_admin_or_moderator());
