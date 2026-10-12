-- Lucky Lion — Site Settings (staff-editable contact info & links)
-- Paste into Supabase → SQL Editor → Run.

create table if not exists site_settings (
  key   text primary key,
  value text
);
alter table site_settings enable row level security;
drop policy if exists "public_all_site_settings" on site_settings;
create policy "public_all_site_settings" on site_settings for all using (true) with check (true);
