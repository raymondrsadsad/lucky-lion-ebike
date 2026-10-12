-- ============ REPAIRS UPGRADE ============
-- Adds service type, charge, and completion timestamp to the repairs table.
-- Safe to run more than once. Run this in the Supabase SQL editor.
alter table repairs add column if not exists repair_type  text;
alter table repairs add column if not exists cost         numeric;
alter table repairs add column if not exists completed_at timestamptz;

-- Backfill completed_at for any repairs already marked done (uses booked date).
update repairs
   set completed_at = (date || 'T00:00:00Z')::timestamptz
 where status = 'done' and completed_at is null and date is not null;
