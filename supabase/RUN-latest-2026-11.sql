-- Lucky Lion eBike — RUN THIS ONE FILE (Nov 2026)
-- =================================================
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- It combines the two pending migrations into a single run. Both parts are
-- idempotent and safe to re-run. Nothing here deletes data.
--
--   Part A — password hashing (bcrypt via pgcrypto)        [security]
--   Part B — repair reviews + who-handled-it columns        [enhancements]
--
-- The site works even before this is applied (every new column/RPC has a
-- graceful fallback), so order vs. the Netlify deploy does not matter.

-- ============================================================
-- Part A — password hashing (bcrypt via pgcrypto)
-- ============================================================
create extension if not exists pgcrypto;

-- Auto-hash any password written to `users` (skips values already bcrypt-hashed).
create or replace function hash_user_password()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  if NEW.password is not null and NEW.password !~ '^\$2[aby]\$' then
    NEW.password := crypt(NEW.password, gen_salt('bf'));
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_hash_user_password on users;
create trigger trg_hash_user_password
  before insert or update of password on users
  for each row execute function hash_user_password();

-- One-time backfill: hash every existing plaintext password.
update users
   set password = crypt(password, gen_salt('bf'))
 where password is not null
   and password !~ '^\$2[aby]\$';

-- Server-side login (password compared in Postgres, never in the browser).
create or replace function verify_login(p_username text, p_password text)
returns setof users
language sql
stable
security definer
set search_path = public, extensions
as $$
  select * from users
   where username = p_username
     and password = crypt(p_password, password)
   limit 1;
$$;

-- Server-side current-password check for "change password".
create or replace function verify_password(p_id text, p_password text)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1 from users
     where id = p_id
       and password = crypt(p_password, password)
  );
$$;

grant execute on function verify_login(text, text)   to anon, authenticated;
grant execute on function verify_password(text, text) to anon, authenticated;

-- ============================================================
-- Part B — repair reviews + who-handled-it (enhancements batch)
-- ============================================================
alter table repairs add column if not exists handled_by  text;          -- staff member who did the repair
alter table repairs add column if not exists rating      int;           -- customer rating 1–5
alter table repairs add column if not exists review      text;          -- customer comment
alter table repairs add column if not exists reviewed_at timestamptz;   -- when the review was left

-- ============================================================
-- Part C — Trash Bin (soft delete) + Activity Log (admin-fixes batch, item 2)
-- ============================================================
-- After this runs, js/api.js detectTrash() flips soft-delete ON automatically:
-- deleting a customer / repair / e-bike unit sets deleted_at (Restorable from the
-- admin Trash Bin) instead of hard-deleting; key actions are written to activity_log.
-- Until it's run, the app behaves exactly as before (permanent deletes, empty Trash).

-- 1) Soft-delete marker on the three deletable tables.
alter table public.users       add column if not exists deleted_at timestamptz;
alter table public.repairs     add column if not exists deleted_at timestamptz;
alter table public.user_ebikes add column if not exists deleted_at timestamptz;

-- Partial indexes so the "not deleted" list filter stays fast.
create index if not exists users_not_deleted_idx       on public.users       (deleted_at) where deleted_at is null;
create index if not exists repairs_not_deleted_idx     on public.repairs     (deleted_at) where deleted_at is null;
create index if not exists user_ebikes_not_deleted_idx on public.user_ebikes (deleted_at) where deleted_at is null;

-- 2) Audit trail.
create table if not exists public.activity_log (
  id         text primary key,
  at         timestamptz not null default now(),
  actor      text,              -- who did it (name or username)
  actor_role text,              -- 'admin' | 'staff' | 'customer'
  action     text not null,     -- 'create' | 'delete' | 'restore' | 'purge'
  entity     text,              -- 'customer' | 'staff' | 'admin' | 'repair' | 'unit'
  entity_id  text,
  summary    text               -- human-readable line shown in the log
);
create index if not exists activity_log_at_idx on public.activity_log (at desc);

-- Prototype: open access via the anon key (same posture as every other table).
alter table public.activity_log enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'activity_log' and policyname = 'activity_log_all') then
    create policy activity_log_all on public.activity_log for all using (true) with check (true);
  end if;
end $$;
