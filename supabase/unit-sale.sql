-- =====================================================================
-- Lucky Lion — SALE DETAILS on a customer's owned unit.
-- Paste into Supabase → SQL Editor → Run. Additive + idempotent.
-- Adds mode of payment, the actual total price paid, and a free-text note.
-- The sale_price (when set) is what Analytics counts as revenue for that unit.
-- =====================================================================

alter table user_ebikes add column if not exists payment_mode text;   -- Cash | Home Credit | Credit Card | Other
alter table user_ebikes add column if not exists sale_price   numeric; -- actual total price paid (may differ from SRP)
alter table user_ebikes add column if not exists sale_note    text;    -- staff/admin-only free text
