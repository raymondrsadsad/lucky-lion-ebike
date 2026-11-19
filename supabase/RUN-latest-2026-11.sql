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
