-- Lucky Lion — Phase 1: per-unit details on a customer's owned e-bikes.
-- Paste into Supabase → SQL Editor → Run. Safe to re-run (idempotent).
--
-- Each owned unit can now record the chosen color variant plus the physical
-- identifiers stamped on the bike.

alter table user_ebikes add column if not exists variant_id text;
alter table user_ebikes add column if not exists color      text;
alter table user_ebikes add column if not exists chassis_no text;
alter table user_ebikes add column if not exists battery_no text;
alter table user_ebikes add column if not exists motor_no   text;
