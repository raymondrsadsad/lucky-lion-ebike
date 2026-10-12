-- =====================================================================
-- Lucky Lion — REMOVE all demo data created by demo-data.sql.
-- Paste into Supabase → SQL Editor → Run. Run this after the demo.
-- Only touches `demo-`/`test-` seed rows, the flags the demo set on
-- existing models, and per-branch stock. Your real data (and the admin
-- account) is left alone.
-- =====================================================================

-- demo rows (child tables first; deleting the users also cascades their
-- e-bikes / repairs / messages, but we clear explicitly to be safe)
delete from messages       where id like 'demo-%';
delete from repairs        where id like 'demo-%';
delete from user_ebikes    where id like 'demo-%';
delete from users          where id like 'demo-%';
delete from model_variants where id like 'demo-%' or id like 'test-%';
delete from model_meta     where id like 'demo-%' or id like 'test-%';

-- undo the On Sale / New flags the demo set on EXISTING models
update model_meta set on_sale = false, sale_cash = null, is_new = false
where id in ('lucky-agila-v2','lucky-lion-e-car','honor-v1','honor-v3',
             'lucky-eagle','lucky-god-super-v3','lucky-bee','big-cargo','kt31s');

-- clear per-branch brand-new stock (the demo is the only source of it during a
-- demo; real per-branch stock is entered later via staff → Inventory). If you
-- have already entered real stock and want to keep it, delete this line.
delete from variant_stock;

-- =====================================================================
-- Done. Demo data removed. (The admin / admin123 account stays — it was
-- seeded by RUN-ALL-new-features.sql, not by the demo.)
-- =====================================================================
