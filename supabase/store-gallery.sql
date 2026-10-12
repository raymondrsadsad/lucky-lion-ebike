-- Lucky Lion — Store Gallery (staff-uploaded photos)
-- PREREQUISITE: In Supabase → Storage → create a PUBLIC bucket named exactly: store-photos
-- Then paste this whole file into SQL Editor → Run.

-- ===== table listing the photos =====
create table if not exists store_photos (
  id         text primary key,
  path       text,               -- object path inside the bucket
  url        text not null,       -- public URL
  sort       int default 0,
  created_at timestamptz default now()
);
alter table store_photos enable row level security;
drop policy if exists "public_all_store_photos" on store_photos;
create policy "public_all_store_photos" on store_photos for all using (true) with check (true);

-- ===== storage access for the 'store-photos' bucket =====
-- Public read + open write/delete (prototype demo, matches the rest of the app).
drop policy if exists "store_photos_read"   on storage.objects;
drop policy if exists "store_photos_write"  on storage.objects;
drop policy if exists "store_photos_delete" on storage.objects;
create policy "store_photos_read"   on storage.objects for select using (bucket_id = 'store-photos');
create policy "store_photos_write"  on storage.objects for insert with check (bucket_id = 'store-photos');
create policy "store_photos_delete" on storage.objects for delete using (bucket_id = 'store-photos');
