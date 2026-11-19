-- Lucky Lion eBike — password hashing (bcrypt via pgcrypto)
-- =========================================================
-- Turns the plaintext `users.password` column into bcrypt hashes so a password
-- is never stored in the clear and is NEVER compared in the browser. Login and
-- the change-password check now run server-side in Postgres (RPCs below).
--
-- Run ONCE in Supabase → SQL Editor → New query → Run. Safe to re-run
-- (idempotent: the trigger and the backfill both skip values already hashed).
-- The app degrades gracefully until this is run (api.js falls back to the old
-- plaintext match if these functions don't exist yet).

-- pgcrypto gives us crypt() + gen_salt('bf'). On Supabase it usually already
-- lives in the `extensions` schema; this is a no-op if so.
create extension if not exists pgcrypto;

-- 1) Auto-hash any password written to `users`. Skips values that are already a
--    bcrypt hash (so re-running, or a PATCH that re-saves a hash, won't double-hash).
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

-- 2) One-time backfill: hash every existing plaintext password.
update users
   set password = crypt(password, gen_salt('bf'))
 where password is not null
   and password !~ '^\$2[aby]\$';

-- 3) Server-side login. The password is compared inside Postgres with crypt();
--    the plaintext never touches a client-visible query string, and the result
--    set is empty on a wrong password.
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

-- 4) Server-side "current password" check for the change-password flow.
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
