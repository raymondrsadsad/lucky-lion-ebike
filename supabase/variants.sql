-- Lucky Lion — Phase 1: model color VARIANTS + per-variant stock.
-- Paste into Supabase → SQL Editor → Run. Safe to re-run (idempotent).
--
-- A variant = one color of a model, with its own stock count and (optionally) its
-- own photos. Photos live in model_photos and are tagged with variant_id (NULL =
-- a general model photo shown for every color).

create table if not exists model_variants (
  id         text primary key,
  model_id   text not null,        -- products.json id or a custom model id
  name       text,                 -- color name, e.g. "Red"
  color_hex  text,                 -- swatch color, e.g. "#d22222"
  stock      int  not null default 0,
  sort       int  default 0,
  created_at timestamptz default now()
);
create index if not exists model_variants_model_idx on model_variants (model_id);

alter table model_variants enable row level security;
drop policy if exists "public_all_model_variants" on model_variants;
create policy "public_all_model_variants" on model_variants for all using (true) with check (true);

-- Tag photos to a color variant (NULL = general photo, shown for any color).
alter table model_photos add column if not exists variant_id text;

-- ===== Seed 2 placeholder color variants per base model (only where none exist) =====
insert into model_variants (id, model_id, name, color_hex, stock, sort)
select m.mid || '-' || c.slug, m.mid, c.name, c.hex, 0, c.sort
from (values
  ('lucky-agila-v2'),('k4004-v4'),('lucky-lion-e-car'),('lucky-golf-v-plus-v4'),
  ('lucky-golf-v-plus-v5'),('lucky-golf-v-plus-v6'),('honor-v1'),('honor-v3'),
  ('kt31s'),('lucky-god-plus-r3-v2'),('lucky-god-super-v2'),('lucky-god-super-v3'),
  ('lucky-god-super-v4'),('lucky-god-super-v5'),('lucky-god-super-v6'),('lucky-god-super-v7'),
  ('big-cargo'),('lucky-sheep-plus-v8'),('lucky-bee'),('lucky-eagle'),
  ('lucky-turtle'),('lucky-deer')
) as m(mid)
cross join (values
  ('Red',   '#d22222', 0, 'red'),
  ('Black', '#222222', 1, 'black')
) as c(name, hex, sort, slug)
where not exists (select 1 from model_variants v where v.model_id = m.mid);
