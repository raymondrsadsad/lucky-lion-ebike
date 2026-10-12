-- Lucky Lion — Model Photos (staff-uploaded, multiple photos per model)
-- Reuses the EXISTING public 'store-photos' storage bucket, so no new bucket is needed.
-- Paste this whole file into Supabase → SQL Editor → Run. Safe to re-run.
create table if not exists model_photos (
  id         text primary key,
  model_id   text not null,      -- the model this photo belongs to (products.json id or custom id)
  path       text,               -- object path inside the store-photos bucket
  url        text not null,      -- public URL
  sort       int default 0,      -- display order; the first photo is the main/card image
  created_at timestamptz default now()
);
create index if not exists model_photos_model_idx on model_photos (model_id);

alter table model_photos enable row level security;
drop policy if exists "public_all_model_photos" on model_photos;
create policy "public_all_model_photos" on model_photos for all using (true) with check (true);

