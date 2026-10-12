-- Lucky Lion — Phase 2b: "time acquired" for each owned e-bike (E-Bike Registry).
-- Paste into Supabase → SQL Editor → Run. Safe to re-run (idempotent).

alter table user_ebikes add column if not exists acquired_at text;   -- YYYY-MM-DD

-- backfill existing units from their created_at so the registry isn't blank
update user_ebikes set acquired_at = to_char(created_at, 'YYYY-MM-DD')
where acquired_at is null or acquired_at = '';
