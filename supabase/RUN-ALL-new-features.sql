-- =====================================================================
-- Lucky Lion — ALL new-feature migrations in one file.
-- Paste this WHOLE file into Supabase → SQL Editor → New query → Run.
-- Everything here is additive and idempotent (safe to run again).
-- Covers: colour variants + stock, unit details, pre-loved units,
--         E-Bike Registry (acquired date), and messaging/inbox.
-- =====================================================================


-- ========== 1) COLOUR VARIANTS + PER-COLOUR STOCK ==========
-- A variant = one colour of a model, with its own stock and (optionally) photos.
create table if not exists model_variants (
  id         text primary key,
  model_id   text not null,        -- products.json id or a custom model id
  name       text,                 -- colour name, e.g. "Red"
  color_hex  text,                 -- swatch colour, e.g. "#d22222"
  stock      int  not null default 0,
  sort       int  default 0,
  created_at timestamptz default now()
);
create index if not exists model_variants_model_idx on model_variants (model_id);

alter table model_variants enable row level security;
drop policy if exists "public_all_model_variants" on model_variants;
create policy "public_all_model_variants" on model_variants for all using (true) with check (true);

-- Tag photos to a colour variant (NULL = general photo, shown for any colour).
alter table model_photos add column if not exists variant_id text;

-- Seed 2 placeholder colours per base model (only where none exist yet).
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


-- ========== 2) PRE-LOVED (SECOND-HAND) UNITS ==========
-- A model flagged is_preloved shows in the store's "Pre-loved Units" group
-- and its own listing page instead of the brand-new 4/3/2-wheel groups.
-- Each pre-loved unit is 1-of-1, so it carries its own physical identifiers.
alter table model_meta add column if not exists is_preloved boolean default false;
alter table model_meta add column if not exists color       text;
alter table model_meta add column if not exists chassis_no  text;
alter table model_meta add column if not exists battery_no  text;
alter table model_meta add column if not exists motor_no    text;
alter table model_meta add column if not exists sold        boolean default false;


-- ========== 3) PER-UNIT DETAILS ON A CUSTOMER'S OWNED E-BIKES ==========
-- Chosen colour + physical identifiers, plus the date the unit was acquired.
alter table user_ebikes add column if not exists variant_id text;
alter table user_ebikes add column if not exists color      text;
alter table user_ebikes add column if not exists chassis_no text;
alter table user_ebikes add column if not exists battery_no text;
alter table user_ebikes add column if not exists motor_no   text;
alter table user_ebikes add column if not exists acquired_at text;   -- YYYY-MM-DD (E-Bike Registry)

-- Backfill acquired_at for existing units so the registry isn't blank.
update user_ebikes set acquired_at = to_char(created_at, 'YYYY-MM-DD')
where acquired_at is null or acquired_at = '';


-- ========== 4) MESSAGING (customer <-> branch staff) ==========
-- One thread per customer. sender = 'customer' | 'staff'.
-- read = whether the OTHER side has seen it.
create table if not exists messages (
  id         text primary key,
  user_id    text references users(id) on delete cascade,
  sender     text not null,
  body       text not null,
  read       boolean default false,
  created_at timestamptz default now()
);
create index if not exists messages_user_idx on messages (user_id, created_at);

alter table messages enable row level security;
drop policy if exists "public_all_messages" on messages;
create policy "public_all_messages" on messages for all using (true) with check (true);

-- ========== 5) MULTI-BRANCH + ADMIN ROLE ==========
-- Per-user branch, admin role + seed, per-branch pre-loved units,
-- and per-branch brand-new stock (variant_stock). See multibranch.sql.

alter table users      add column if not exists branch text;   -- staff/customer branch; admin = NULL
alter table model_meta add column if not exists branch text;   -- pre-loved unit's branch

create table if not exists variant_stock (
  variant_id text not null,
  branch     text not null,
  stock      int  not null default 0,
  updated_at timestamptz default now(),
  primary key (variant_id, branch)
);
create index if not exists variant_stock_variant_idx on variant_stock (variant_id);
alter table variant_stock enable row level security;
drop policy if exists "public_all_variant_stock" on variant_stock;
create policy "public_all_variant_stock" on variant_stock for all using (true) with check (true);

insert into variant_stock (variant_id, branch, stock)
select v.id, 'main', coalesce(v.stock, 0)
from model_variants v
where coalesce(v.stock, 0) > 0
  and not exists (select 1 from variant_stock s where s.variant_id = v.id);

insert into users (id, member_id, role, username, password, name, branch)
values ('admin-1', 'ADMIN-01', 'admin', 'admin', 'admin123', 'Owner / Admin', null)
on conflict (id) do nothing;
update users set branch = 'trece' where id in ('staff-1','user-1') and branch is null;
-- park any other pre-existing staff/customers at 'main' so they don't vanish from branch views
update users set branch = 'main' where role in ('staff','customer') and (branch is null or branch = '');

-- ---- sale details on a customer's owned unit (mode of payment, actual price, note) ----
alter table user_ebikes add column if not exists payment_mode text;
alter table user_ebikes add column if not exists sale_price   numeric;
alter table user_ebikes add column if not exists sale_note    text;

-- =====================================================================
-- Done. All new features should now work against the live database.
-- =====================================================================
