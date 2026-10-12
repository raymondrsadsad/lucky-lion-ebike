-- clear-live-data.sql — wipe operational data for a fresh demo, KEEP the catalog + 3 demo logins.
-- Run in Supabase → SQL Editor. This was already applied once via the REST API on 2026-09-13.
--
-- CLEARS: all repairs, all owned e-bikes (the registry), all customer messages,
--         and every user account EXCEPT the three demo logins.
-- KEEPS:  model_meta (models + staff edits), model_photos (main + colour photos),
--         model_variants (colours), store_photos, site_settings.
--
-- Re-running is safe (idempotent — deletes nothing that's already gone).

begin;

delete from repairs;
delete from user_ebikes;   -- the E-Bike Registry
delete from messages;

-- keep only the demo logins: user/user123, staff/staff123, admin/admin123
delete from users where username not in ('user', 'staff', 'admin');

commit;
