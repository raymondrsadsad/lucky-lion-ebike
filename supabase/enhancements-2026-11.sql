-- Lucky Lion — enhancements batch (Nov 2026)
-- Run once in Supabase → SQL Editor. Idempotent; safe to re-run.
-- Adds: who performed a repair (#8) + customer star review of a completed repair (#9).

alter table repairs add column if not exists handled_by  text;          -- staff member who did the repair
alter table repairs add column if not exists rating      int;           -- customer rating 1–5
alter table repairs add column if not exists review       text;          -- customer comment
alter table repairs add column if not exists reviewed_at  timestamptz;   -- when the review was left
