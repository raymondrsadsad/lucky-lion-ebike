-- Lucky Lion — Pre-loved units are 1-of-1: give each its own physical identifiers.
-- Paste into Supabase → SQL Editor → Run. Safe to re-run (idempotent).

alter table model_meta add column if not exists color      text;
alter table model_meta add column if not exists chassis_no text;
alter table model_meta add column if not exists battery_no text;
alter table model_meta add column if not exists motor_no   text;
alter table model_meta add column if not exists sold       boolean default false;   -- 1-of-1: mark when it's gone
