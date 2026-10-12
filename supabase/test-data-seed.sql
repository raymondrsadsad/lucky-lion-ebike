-- =====================================================================
-- Lucky Lion — TEST DATA (so you can exercise every feature).
-- Paste into Supabase → SQL Editor → Run. Safe to re-run.
-- Run AFTER RUN-ALL-new-features.sql (needs the new tables/columns).
--
-- Everything created here is stamped with a `test-` id prefix, so
-- supabase/test-data-cleanup.sql removes all of it in one go.
-- EXISTING models are NOT modified except on_sale/is_new flags + stock
-- (their names, specs, and bundled photos are left exactly as they are).
-- =====================================================================


-- ---------- Site settings: multiple contact numbers + branch info ----------
insert into site_settings (key, value) values
  ('contacts', '[{"key":"store","label":"Store / Sales","numbers":["0997-955-8909","0917-100-2000"]},{"key":"repairs","label":"Repairs / Service","numbers":["0918-222-3333"]},{"key":"financing","label":"Home Credit / Financing","numbers":["0920-444-5555"]}]'),
  ('address', '13th Martyrs (Josefino Bldg), Brgy. San Agustin, Trece Martires City, Cavite'),
  ('hours',   'Open daily 8:30 AM – 5:30 PM')
on conflict (key) do update set value = excluded.value;


-- ---------- Users: 3 customers + 1 extra staff ----------
insert into users (id, member_id, role, username, password, name, email, phone, address, owned_model_id) values
  ('test-cust-1','CUST-9001','customer','maria','maria123','Maria Santos','maria@example.com','0917-111-1111','Brgy. Luciano, Trece Martires City, Cavite','lucky-agila-v2'),
  ('test-cust-2','CUST-9002','customer','pedro','pedro123','Pedro Reyes','','0917-222-2222','Brgy. Conchu, Trece Martires City, Cavite','lucky-god-super-v3'),
  ('test-cust-3','CUST-9003','customer','ana','ana123','Ana Lim','ana@example.com','0917-333-3333','Brgy. Osorio, Tanza, Cavite','lucky-eagle'),
  ('test-staff-1','STAFF-9001','staff','rico','rico123','Rico Cruz','rico@example.com','0999-888-7777','Trece Martires City, Cavite', null)
on conflict (id) do nothing;


-- ---------- Owned e-bikes (colour + chassis/battery/motor + acquired date) ----------
insert into user_ebikes (id, user_id, model_id, variant_id, color, chassis_no, battery_no, motor_no, acquired_at) values
  ('test-ue-1','test-cust-1','lucky-agila-v2','lucky-agila-v2-red','Red','LLX-AG2-00123','BAT-77812','MTR-55021','2026-03-14'),
  ('test-ue-2','test-cust-1','lucky-eagle','lucky-eagle-black','Black','LLX-EAG-00988','BAT-11002','MTR-30119','2026-06-02'),
  ('test-ue-3','test-cust-2','lucky-god-super-v3','lucky-god-super-v3-red','Red','LLX-GS3-04412','BAT-22114','MTR-77450','2025-11-20'),
  ('test-ue-4','test-cust-3','lucky-eagle','lucky-eagle-black','Black','LLX-EAG-07741','BAT-90031','MTR-64220','2026-07-01')
on conflict (id) do nothing;


-- ---------- Repairs: pending / in-progress / overdue / done ----------
insert into repairs (id, user_id, model_id, date, time_slot, status, notes, repair_type, cost, completed_at) values
  ('test-rep-1','test-cust-1','lucky-agila-v2', to_char(now() + interval '1 day','YYYY-MM-DD'), '10:00–12:00','pending','Front brake feels loose','Brake Service', null, null),
  ('test-rep-2','test-cust-2','lucky-god-super-v3', to_char(now(),'YYYY-MM-DD'), '13:00–15:00','in-progress','Battery drains fast','Battery Check', null, null),
  ('test-rep-3','test-cust-3','lucky-eagle', to_char(now() - interval '3 day','YYYY-MM-DD'), '08:00–10:00','pending','Flat rear tire','Tire Replacement', null, null),
  ('test-rep-4','test-cust-1','lucky-eagle', to_char(now() - interval '10 day','YYYY-MM-DD'), '15:00–17:00','done','Full tune-up completed','Tune-up', 850, now() - interval '9 day')
on conflict (id) do nothing;


-- ---------- Messages: 2 threads, some unread from customers ----------
insert into messages (id, user_id, sender, body, read, created_at) values
  ('test-msg-1','test-cust-1','customer','Hi, is my Lucky Agila ready for pickup?', false, now() - interval '2 hour'),
  ('test-msg-2','test-cust-1','staff','Hi Maria! Almost — the brake parts arrive tomorrow.', true, now() - interval '90 minute'),
  ('test-msg-3','test-cust-1','customer','Thank you! I will wait.', false, now() - interval '30 minute'),
  ('test-msg-4','test-cust-2','customer','Do you offer Home Credit for the God Super?', false, now() - interval '1 day')
on conflict (id) do nothing;


-- ---------- Existing models: On Sale / New Arrival flags (nothing else touched) ----------
insert into model_meta (id, on_sale, sale_cash, is_new, sort) values
  ('lucky-agila-v2', true, 129000, false, 0),
  ('lucky-lion-e-car', false, null, true, 0),
  ('honor-v1', true, 66000, true, 0)
on conflict (id) do update set on_sale = excluded.on_sale, sale_cash = excluded.sale_cash, is_new = excluded.is_new;


-- ---------- A custom BRAND-NEW model (with 2 colours, one out of stock) ----------
insert into model_meta (id, name, wheels, motor_w, battery, brakes, srp, is_custom, is_new, sort) values
  ('test-model-newcity','New City Cruiser (Test)','2-wheels',800,'60V/24AH Lithium','Front & Rear Disc',54000,true,true,1)
on conflict (id) do nothing;
insert into model_variants (id, model_id, name, color_hex, stock, sort) values
  ('test-var-nc-blue','test-model-newcity','Blue','#1f6fd4',5,0),
  ('test-var-nc-white','test-model-newcity','White','#e8e8e8',0,1)
on conflict (id) do nothing;


-- ---------- Pre-loved units (1-of-1): one on sale, one plain, one SOLD ----------
insert into model_meta (id, name, wheels, motor_w, battery, brakes, srp, is_custom, is_preloved, sold, color, chassis_no, battery_no, motor_no, on_sale, sale_cash, sort) values
  ('test-pl-1','Lucky Eagle (2023, Pre-loved)','2-wheels',500,'48V/20AH Lead Acid','Rear Drum',22000,true,true,false,'Red','LLX-USED-1123','BAT-U-4410','MTR-U-8890', true, 19500, 0),
  ('test-pl-2','God Super V2 (Pre-loved)','3-wheels',1000,'60V/32AH Lead Acid','Front Disc / Rear Drum',48000,true,true,false,'Black','LLX-USED-2244','BAT-U-1120','MTR-U-3320', false, null, 1),
  ('test-pl-3','K4004 V4 (Pre-loved, SOLD)','4-wheels',1500,'60V/20AH Lead Acid','Rear Drum',52000,true,true,true,'White','LLX-USED-3391','BAT-U-9982','MTR-U-2200', false, null, 2)
on conflict (id) do nothing;


-- ---------- Stock on existing models' colours (incl. some out of stock) ----------
update model_variants set stock = 8 where id = 'lucky-agila-v2-red';
update model_variants set stock = 3 where id = 'lucky-agila-v2-black';
update model_variants set stock = 0 where id = 'lucky-eagle-red';
update model_variants set stock = 6 where id = 'lucky-eagle-black';
update model_variants set stock = 2 where id = 'lucky-god-super-v3-red';
update model_variants set stock = 0 where id = 'lucky-god-super-v3-black';
update model_variants set stock = 10 where id = 'honor-v1-red';

-- =====================================================================
-- Done. Log in on the public site as maria / maria123 (customer),
-- or staff / staff123 (or rico / rico123) for the portal.
-- =====================================================================
