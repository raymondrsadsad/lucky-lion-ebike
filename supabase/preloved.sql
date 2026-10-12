-- Lucky Lion — Phase 2: pre-loved (second-hand) units.
-- Paste into Supabase → SQL Editor → Run. Safe to re-run (idempotent).
--
-- A model flagged is_preloved is shown in the store's "Pre-loved Units" group and
-- its own listing page, instead of the brand-new 4/3/2-wheel groups. It keeps its
-- real wheel count so the pre-loved page can still sort by wheels.

alter table model_meta add column if not exists is_preloved boolean default false;
