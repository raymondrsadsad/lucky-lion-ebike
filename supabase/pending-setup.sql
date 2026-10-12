-- Lucky Lion — PENDING Supabase setup (run ONCE before deploying).
-- Safe to re-run. This bundles everything not yet applied (Phase 2 onward).
-- (schema.sql and store-gallery.sql were already run earlier.)

-- ===== Phase 2: site settings (staff-editable contact info / links) =====
create table if not exists site_settings ( key text primary key, value text );
alter table site_settings enable row level security;
drop policy if exists "public_all_site_settings" on site_settings;
create policy "public_all_site_settings" on site_settings for all using (true) with check (true);

-- ===== Phase 2: multiple e-bike units per customer =====
create table if not exists user_ebikes (
  id         text primary key,
  user_id    text references users(id) on delete cascade,
  model_id   text,
  created_at timestamptz default now()
);
alter table user_ebikes enable row level security;
drop policy if exists "public_all_user_ebikes" on user_ebikes;
create policy "public_all_user_ebikes" on user_ebikes for all using (true) with check (true);

-- migrate each user's existing single owned_model_id into user_ebikes
insert into user_ebikes (id, user_id, model_id)
select 'ue-' || u.id, u.id, u.owned_model_id
from users u
where u.owned_model_id is not null and u.owned_model_id <> ''
on conflict (id) do nothing;

-- ===== Phase 3: editable models (badges, sale prices, price, add/remove) =====
create table if not exists model_meta (
  id         text primary key,   -- matches a products.json id, or a new custom id
  name       text, wheels text, motor_w int, battery text, brakes text, srp int,
  on_sale    boolean default false,
  sale_cash  int, sale_cc int, sale_hc int,
  is_new     boolean default false,
  hidden     boolean default false,   -- hide a base model from the store
  is_custom  boolean default false,   -- true = a staff-added model (not in products.json)
  sort       int default 0,
  created_at timestamptz default now()
);
alter table model_meta enable row level security;
drop policy if exists "public_all_model_meta" on model_meta;
create policy "public_all_model_meta" on model_meta for all using (true) with check (true);

-- (Later phases will append their tables here.)
