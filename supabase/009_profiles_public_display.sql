-- Umožní zobrazení jmen u komentářů i bez service-role klíče na serveru.
-- E-mail a role zůstávají chráněné vlastní politikou „profiles select own“.

drop policy if exists "profiles select public display" on profiles;
create policy "profiles select public display"
  on profiles
  for select
  to anon, authenticated
  using (true);
