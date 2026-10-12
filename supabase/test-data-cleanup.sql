-- =====================================================================
-- Lucky Lion — REMOVE all test data created by test-data-seed.sql.
-- Paste into Supabase → SQL Editor → Run. Run this before going live.
-- Only touches `test-` rows + the flags/stock the seed changed on
-- existing models. Your real data is left alone.
-- =====================================================================

-- test rows (child tables first)
delete from messages    where id like 'test-%';
delete from repairs     where id like 'test-%';
delete from user_ebikes where id like 'test-%';
delete from users       where id like 'test-%';
delete from model_variants where id like 'test-%';
delete from model_meta     where id like 'test-%';

-- undo the flags the seed set on existing models
update model_meta set on_sale = false, sale_cash = null, is_new = false
where id in ('lucky-agila-v2','lucky-lion-e-car','honor-v1');

-- undo the stock the seed set on existing models' colours
update model_variants set stock = 0
where id in ('lucky-agila-v2-red','lucky-agila-v2-black','lucky-eagle-red','lucky-eagle-black',
             'lucky-god-super-v3-red','lucky-god-super-v3-black','honor-v1-red');

-- remove the test contact numbers (leave address/hours if you want to keep them)
delete from site_settings where key = 'contacts';

-- =====================================================================
-- Done. Test data removed.
-- =====================================================================
