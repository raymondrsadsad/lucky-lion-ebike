-- ============================================================================
-- panel-revisions.sql — schema changes for the capstone panel revisions (2026-10)
-- Run once in Supabase → SQL Editor. Idempotent (safe to re-run).
-- ============================================================================

-- #8 Temporary-password flow: force a password change on first login for
--    staff/admin-created accounts. Public self-signup sets this false.
alter table users add column if not exists must_change_password boolean default false;

-- #11 / #12 / #17 Stamp which branch a repair belongs to. Customer-booked repairs
--    inherit the customer's branch; staff/admin create-on-behalf set it explicitly.
--    App falls back to the customer's branch when this is null, so backfill is optional.
alter table repairs add column if not exists branch text;

-- Optional backfill: set existing repairs' branch from the owning customer's branch.
update repairs r
set branch = u.branch
from users u
where r.user_id = u.id
  and r.branch is null
  and u.branch is not null;
