-- =====================================================================
-- Lucky Lion — MULTI-BRANCH + ADMIN ROLE migration.
-- Paste this WHOLE file into Supabase → SQL Editor → New query → Run.
-- Everything here is additive and idempotent (safe to run again).
-- Adds: per-user branch, admin role + seed, per-branch pre-loved units,
--       per-branch brand-new stock (variant_stock).
-- =====================================================================


-- ========== 1) BRANCH ON USERS + ADMIN ROLE ==========
-- role is now 'customer' | 'staff' | 'admin'. Admins are global (branch NULL).
-- Staff + customers carry a branch key: main | imus | trece | tanza | naic | tejero | gma
alter table users add column if not exists branch text;


-- ========== 2) BRANCH ON PRE-LOVED UNITS ==========
-- Pre-loved units are 1-of-1 model_meta rows; each belongs to one branch.
alter table model_meta add column if not exists branch text;


-- ========== 3) PER-BRANCH BRAND-NEW STOCK ==========
-- Colour identity stays in model_variants; the actual on-hand count is now
-- per (colour, branch). Public store shows the SUM across branches; each staff
-- edits only their own branch's row.
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

-- Optional one-time seed: move each variant's existing global stock into the
-- MAIN branch, so nothing is lost. Runs only where no per-branch row exists yet.
insert into variant_stock (variant_id, branch, stock)
select v.id, 'main', coalesce(v.stock, 0)
from model_variants v
where coalesce(v.stock, 0) > 0
  and not exists (select 1 from variant_stock s where s.variant_id = v.id);


-- ========== 4) SEED THE FIRST ADMIN ==========
-- The boss logs in with this, then creates more admins/staff in the portal.
-- Change the password after first login.
insert into users (id, member_id, role, username, password, name, branch)
values ('admin-1', 'ADMIN-01', 'admin', 'admin', 'admin123', 'Owner / Admin', null)
on conflict (id) do nothing;

-- Give the existing seed staff a branch so they still work (Trece).
update users set branch = 'trece' where id = 'staff-1' and branch is null;
-- Give the existing seed customer a branch too.
update users set branch = 'trece' where id = 'user-1' and branch is null;

-- Backfill: any OTHER pre-existing staff/customers had no branch and would disappear
-- from every branch view — park them at 'main' so nothing is lost (reassign in-portal).
update users set branch = 'main'
where role in ('staff','customer') and (branch is null or branch = '');

-- =====================================================================
-- Done. Multi-branch + admin should now work against the live database.
-- =====================================================================
