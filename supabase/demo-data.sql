-- =====================================================================
-- Lucky Lion — DEMO DATA (FULL) for the walkthrough (all 7 branches).
-- Paste into Supabase → SQL Editor → New query → Run.
-- Run AFTER RUN-ALL-new-features.sql (needs the new tables/columns +
-- the seeded admin account). Safe to re-run (it clears its own rows first).
--
-- This fills every screen: 7 branches each with a customer + staff, ~20
-- owned units (several handed over TODAY → "Sold today" + revenue), ~23
-- repairs in every state (booked today, completed today, overdue, done,
-- cancelled, upcoming), ~14 messages (several unread), on-sale/new flags,
-- a custom new model, pre-loved units, and per-branch stock everywhere.
--
-- Every row is `demo-` prefixed → supabase/demo-data-cleanup.sql wipes it.
-- Dates use PH time (now()+8h) so "today" lines up on the day you present.
-- Logins (password = username + "123"): see Lucky-Lion-Logins.docx.
-- Global admin = admin / admin123 (seeded by RUN-ALL, not here).
-- =====================================================================


-- ---------- Make this seed authoritative + safely re-runnable ----------
-- Older test-data-seed.sql (if you ran it) reused some usernames under
-- `test-` ids, which have their own unique-username constraint. Remove any
-- prior demo/test seed rows that would clash (child rows cascade). This
-- ONLY touches `test-`/`demo-` seed rows — never your real customers.
delete from users where username in (
  'maria','rico','pedro','juan','ana','lito','carlo','bea',
  'rosa','nico','dennis','grace','mila','paolo'
) and (id like 'test-%' or id like 'demo-%');
delete from messages       where id like 'demo-%';
delete from repairs        where id like 'demo-%';
delete from user_ebikes    where id like 'demo-%';
delete from model_variants where id like 'demo-%' or id like 'test-%';
delete from model_meta     where id like 'demo-%' or id like 'test-%';


-- ---------- Users: 1 CUSTOMER + 1 STAFF for every branch (14 accounts) ----------
insert into users (id, member_id, role, username, password, name, email, phone, address, owned_model_id, branch) values
  ('demo-cust-main','MAIN-C-0001','customer','maria','maria123','Maria Santos','maria@example.com','0917-111-1101','Brgy. Buhay na Tubig, Imus, Cavite','lucky-agila-v2','main'),
  ('demo-staff-main','MAIN-S-01','staff','rico','rico123','Rico Cruz','rico@luckylion.ph','0999-100-0001','Buhay na Tubig, Imus, Cavite', null,'main'),
  ('demo-cust-imus','IMUS-C-0001','customer','pedro','pedro123','Pedro Reyes','pedro@example.com','0917-111-1102','Brgy. Anabu, Imus, Cavite','lucky-lion-e-car','imus'),
  ('demo-staff-imus','IMUS-S-01','staff','juan','juan123','Juan Delos Reyes','juan@luckylion.ph','0999-100-0002','Imus, Cavite', null,'imus'),
  ('demo-cust-trece','TRECE-C-0001','customer','ana','ana123','Ana Lim','ana@example.com','0917-111-1103','Brgy. San Agustin, Trece Martires City, Cavite','lucky-eagle','trece'),
  ('demo-staff-trece','TRECE-S-01','staff','lito','lito123','Lito Ramos','lito@luckylion.ph','0999-100-0003','Trece Martires City, Cavite', null,'trece'),
  ('demo-cust-tanza','TANZA-C-0001','customer','carlo','carlo123','Carlo Mendoza','carlo@example.com','0917-111-1104','Brgy. Daang Amaya, Tanza, Cavite','big-cargo','tanza'),
  ('demo-staff-tanza','TANZA-S-01','staff','bea','bea123','Bea Villanueva','bea@luckylion.ph','0999-100-0004','Tanza, Cavite', null,'tanza'),
  ('demo-cust-naic','NAIC-C-0001','customer','rosa','rosa123','Rosa Fernandez','rosa@example.com','0917-111-1105','Brgy. Halang, Naic, Cavite','lucky-god-super-v3','naic'),
  ('demo-staff-naic','NAIC-S-01','staff','nico','nico123','Nico Aquino','nico@luckylion.ph','0999-100-0005','Naic, Cavite', null,'naic'),
  ('demo-cust-tejero','TEJERO-C-0001','customer','dennis','dennis123','Dennis Garcia','dennis@example.com','0917-111-1106','Tejero, General Trias, Cavite','honor-v3','tejero'),
  ('demo-staff-tejero','TEJERO-S-01','staff','grace','grace123','Grace Bautista','grace@luckylion.ph','0999-100-0006','General Trias, Cavite', null,'tejero'),
  ('demo-cust-gma','GMA-C-0001','customer','mila','mila123','Mila Torres','mila@example.com','0917-111-1107','Brgy. San Gabriel, Gen. Mariano Alvarez, Cavite','lucky-bee','gma'),
  ('demo-staff-gma','GMA-S-01','staff','paolo','paolo123','Paolo Navarro','paolo@luckylion.ph','0999-100-0007','Gen. Mariano Alvarez, Cavite', null,'gma')
on conflict (id) do nothing;


-- ---------- Owned e-bikes: ~20 units, several handed over TODAY ----------
-- payment_mode + sale_price (₱) drive Analytics revenue; acquired_at drives
-- the "Sold today / this week" figures. Colours match the -red / -black variants.
insert into user_ebikes (id, user_id, model_id, variant_id, color, chassis_no, battery_no, motor_no, acquired_at, payment_mode, sale_price, sale_note) values
  -- === Sold TODAY (5 branches) ===
  ('demo-ue-01','demo-cust-main','lucky-agila-v2','lucky-agila-v2-red','Red','LLX-AG2-10231','BAT-77801','MTR-55011', to_char(now()+interval '8 hour','YYYY-MM-DD'),'Cash',141600,'Paid in full'),
  ('demo-ue-02','demo-cust-imus','honor-v3','honor-v3-black','Black','LLX-HN3-20114','BAT-88010','MTR-66021', to_char(now()+interval '8 hour','YYYY-MM-DD'),'Home Credit',159300,'24-month plan'),
  ('demo-ue-03','demo-cust-tanza','big-cargo','big-cargo-red','Red','LLX-BCG-30455','BAT-45120','MTR-90031', to_char(now()+interval '8 hour','YYYY-MM-DD'),'Credit Card',82600,'For deliveries'),
  ('demo-ue-04','demo-cust-gma','lucky-bee','lucky-bee-red','Red','LLX-BEE-40119','BAT-51004','MTR-12203', to_char(now()+interval '8 hour','YYYY-MM-DD'),'Cash',41300, null),
  ('demo-ue-05','demo-cust-trece','lucky-eagle','lucky-eagle-black','Black','LLX-EAG-50988','BAT-11002','MTR-30119', to_char(now()+interval '8 hour','YYYY-MM-DD'),'Cash',42480, null),
  -- === Earlier sales (this week / month / older) ===
  ('demo-ue-06','demo-cust-main','honor-v1','honor-v1-black','Black','LLX-HN1-60114','BAT-77955','MTR-55088', to_char(now()-interval '20 day','YYYY-MM-DD'),'Home Credit',88500,'12-month plan'),
  ('demo-ue-07','demo-cust-main','lucky-deer','lucky-deer-red','Red','LLX-DER-60552','BAT-51199','MTR-12299', to_char(now()-interval '60 day','YYYY-MM-DD'),'Cash',29500,'Second unit'),
  ('demo-ue-08','demo-cust-imus','lucky-lion-e-car','lucky-lion-e-car-red','Red','LLX-ECR-80455','BAT-88110','MTR-66121', to_char(now()-interval '8 day','YYYY-MM-DD'),'Home Credit',212400,'24-month plan'),
  ('demo-ue-09','demo-cust-imus','kt31s','kt31s-black','Black','LLX-KT3-90233','BAT-33210','MTR-44120', to_char(now()-interval '35 day','YYYY-MM-DD'),'Cash',88500, null),
  ('demo-ue-10','demo-cust-trece','lucky-turtle','lucky-turtle-red','Red','LLX-TRT-10771','BAT-45620','MTR-90531', to_char(now()-interval '15 day','YYYY-MM-DD'),'Cash',41300, null),
  ('demo-ue-11','demo-cust-trece','lucky-god-super-v3','lucky-god-super-v3-black','Black','LLX-GS3-11412','BAT-22214','MTR-77550', to_char(now()-interval '90 day','YYYY-MM-DD'),'Home Credit',59000, null),
  ('demo-ue-12','demo-cust-tanza','lucky-golf-v-plus-v5','lucky-golf-v-plus-v5-black','Black','LLX-GF5-12233','BAT-33810','MTR-44720', to_char(now()-interval '25 day','YYYY-MM-DD'),'Credit Card',88500, null),
  ('demo-ue-13','demo-cust-naic','lucky-god-super-v3','lucky-god-super-v3-red','Red','LLX-GS3-13412','BAT-22114','MTR-77450', to_char(now()-interval '5 day','YYYY-MM-DD'),'Cash',59000, null),
  ('demo-ue-14','demo-cust-naic','lucky-sheep-plus-v8','lucky-sheep-plus-v8-black','Black','LLX-SHP-14002','BAT-19980','MTR-27740', to_char(now()-interval '45 day','YYYY-MM-DD'),'Cash',49560, null),
  ('demo-ue-15','demo-cust-tejero','honor-v3','honor-v3-red','Red','LLX-HN3-15233','BAT-33110','MTR-44020', to_char(now()-interval '3 day','YYYY-MM-DD'),'Home Credit',155000,'Discounted; 18-month plan'),
  ('demo-ue-16','demo-cust-tejero','lucky-god-super-v5','lucky-god-super-v5-black','Black','LLX-GS5-16233','BAT-31210','MTR-42120', to_char(now()-interval '70 day','YYYY-MM-DD'),'Cash',64900, null),
  ('demo-ue-17','demo-cust-gma','lucky-deer','lucky-deer-black','Black','LLX-DER-17552','BAT-51299','MTR-12399', to_char(now()-interval '2 day','YYYY-MM-DD'),'Cash',29500, null),
  ('demo-ue-18','demo-cust-gma','lucky-turtle','lucky-turtle-red','Red','LLX-TRT-18771','BAT-45720','MTR-90631', to_char(now()-interval '100 day','YYYY-MM-DD'),'Cash',41300, null),
  ('demo-ue-19','demo-cust-tanza','lucky-god-plus-r3-v2','lucky-god-plus-r3-v2-red','Red','LLX-GR3-19540','BAT-30610','MTR-48120', to_char(now()-interval '12 day','YYYY-MM-DD'),'Cash',62540, null),
  ('demo-ue-20','demo-cust-naic','lucky-bee','lucky-bee-black','Black','LLX-BEE-20119','BAT-51044','MTR-12243', to_char(now()-interval '30 day','YYYY-MM-DD'),'Home Credit',41300, null)
on conflict (id) do nothing;


-- ---------- Repairs: booked today / completed today / overdue / done / cancelled / upcoming ----------
insert into repairs (id, user_id, model_id, date, time_slot, status, notes, repair_type, cost, completed_at) values
  -- booked TODAY (fills "Booked today")
  ('demo-rep-01','demo-cust-main','lucky-agila-v2', to_char(now()+interval '8 hour','YYYY-MM-DD'), '08:00–10:00','pending','Brake adjustment','Brake Service', null, null),
  ('demo-rep-02','demo-cust-imus','lucky-lion-e-car', to_char(now()+interval '8 hour','YYYY-MM-DD'), '10:00–12:00','in-progress','Battery diagnostics','Battery Check', null, null),
  ('demo-rep-03','demo-cust-tanza','big-cargo', to_char(now()+interval '8 hour','YYYY-MM-DD'), '13:00–15:00','pending','Cargo rack loose','General Check', null, null),
  ('demo-rep-04','demo-cust-naic','lucky-god-super-v3', to_char(now()+interval '8 hour','YYYY-MM-DD'), '15:00–17:00','in-progress','Motor noise','Electrical', null, null),
  -- completed TODAY (fills "Completed today" + today revenue on charges)
  ('demo-rep-05','demo-cust-trece','lucky-eagle', to_char(now()+interval '8 hour','YYYY-MM-DD'), '10:00–12:00','done','Flat tire fixed','Tire Replacement', 650, now()-interval '2 hour'),
  ('demo-rep-06','demo-cust-gma','lucky-bee', to_char(now()-interval '1 day','YYYY-MM-DD'), '08:00–10:00','done','Chain lubed + tuned','Tune-up', 500, now()-interval '3 hour'),
  ('demo-rep-07','demo-cust-tejero','honor-v3', to_char(now()-interval '2 day','YYYY-MM-DD'), '13:00–15:00','done','Motor controller replaced','Electrical', 2500, now()-interval '5 hour'),
  -- OVERDUE (past date, still open → red on the dashboard)
  ('demo-rep-08','demo-cust-trece','lucky-turtle', to_char(now()-interval '3 day','YYYY-MM-DD'), '08:00–10:00','pending','Flat rear tire','Tire Replacement', null, null),
  ('demo-rep-09','demo-cust-naic','lucky-bee', to_char(now()-interval '5 day','YYYY-MM-DD'), '13:00–15:00','pending','Won''t start','Electrical', null, null),
  ('demo-rep-10','demo-cust-tanza','lucky-golf-v-plus-v5', to_char(now()-interval '2 day','YYYY-MM-DD'), '15:00–17:00','in-progress','Brake pads worn','Brake Service', null, null),
  -- DONE history (logged charges)
  ('demo-rep-11','demo-cust-main','honor-v1', to_char(now()-interval '10 day','YYYY-MM-DD'), '10:00–12:00','done','Full tune-up','Tune-up', 850, now()-interval '9 day'),
  ('demo-rep-12','demo-cust-main','lucky-deer', to_char(now()-interval '25 day','YYYY-MM-DD'), '08:00–10:00','done','Brake service','Brake Service', 400, now()-interval '24 day'),
  ('demo-rep-13','demo-cust-imus','kt31s', to_char(now()-interval '15 day','YYYY-MM-DD'), '13:00–15:00','done','Battery replaced','Battery Check', 1200, now()-interval '14 day'),
  ('demo-rep-14','demo-cust-trece','lucky-god-super-v3', to_char(now()-interval '30 day','YYYY-MM-DD'), '15:00–17:00','done','Tire + tune','Tune-up', 700, now()-interval '29 day'),
  ('demo-rep-15','demo-cust-tanza','lucky-god-plus-r3-v2', to_char(now()-interval '20 day','YYYY-MM-DD'), '10:00–12:00','done','Wiring fix','Electrical', 950, now()-interval '19 day'),
  ('demo-rep-16','demo-cust-naic','lucky-sheep-plus-v8', to_char(now()-interval '40 day','YYYY-MM-DD'), '08:00–10:00','done','General check','General Check', 600, now()-interval '39 day'),
  ('demo-rep-17','demo-cust-tejero','lucky-god-super-v5', to_char(now()-interval '12 day','YYYY-MM-DD'), '13:00–15:00','done','Motor service','Electrical', 1500, now()-interval '11 day'),
  ('demo-rep-18','demo-cust-gma','lucky-turtle', to_char(now()-interval '18 day','YYYY-MM-DD'), '15:00–17:00','done','Brake adjust','Brake Service', 350, now()-interval '17 day'),
  -- UPCOMING (future, pending)
  ('demo-rep-19','demo-cust-main','lucky-agila-v2', to_char(now()+interval '2 day','YYYY-MM-DD'), '13:00–15:00','pending','Scheduled tune-up','Tune-up', null, null),
  ('demo-rep-20','demo-cust-imus','lucky-lion-e-car', to_char(now()+interval '3 day','YYYY-MM-DD'), '10:00–12:00','pending','Software update','General Check', null, null),
  ('demo-rep-21','demo-cust-gma','lucky-deer', to_char(now()+interval '1 day','YYYY-MM-DD'), '08:00–10:00','pending','Chain squeak','Tune-up', null, null),
  -- CANCELLED (kept for stats)
  ('demo-rep-22','demo-cust-naic','lucky-god-super-v3', to_char(now()-interval '1 day','YYYY-MM-DD'), '13:00–15:00','cancelled','Customer rescheduled','General Check', null, null),
  ('demo-rep-23','demo-cust-tejero','honor-v3', to_char(now()-interval '4 day','YYYY-MM-DD'), '15:00–17:00','cancelled','No-show','Tune-up', null, null)
on conflict (id) do nothing;


-- ---------- Messages: 7 threads, several unread from customers ----------
-- read = whether the OTHER side has seen it. A customer message with read=false
-- shows as unread in the staff/admin Inbox badge.
insert into messages (id, user_id, sender, body, read, created_at) values
  ('demo-msg-01','demo-cust-main','customer','Hi, is my Lucky Agila ready for pickup?', true,  now()-interval '3 hour'),
  ('demo-msg-02','demo-cust-main','staff','Almost! The brake parts arrive tomorrow.',   true,  now()-interval '170 minute'),
  ('demo-msg-03','demo-cust-main','customer','Great, thank you!',                          false, now()-interval '20 minute'),
  ('demo-msg-04','demo-cust-imus','customer','Do you offer Home Credit for the E-Car?',    true,  now()-interval '1 day'),
  ('demo-msg-05','demo-cust-imus','staff','Yes! 12–24 month terms are available.',        true,  now()-interval '23 hour'),
  ('demo-msg-06','demo-cust-imus','customer','Can I visit this Saturday to apply?',        false, now()-interval '2 hour'),
  ('demo-msg-07','demo-cust-tanza','customer','Can I book a tune-up this weekend?',        false, now()-interval '5 hour'),
  ('demo-msg-08','demo-cust-trece','customer','My Turtle has a flat — can you fix it today?', true, now()-interval '6 hour'),
  ('demo-msg-09','demo-cust-trece','staff','Bring it in before 3 PM and we''ll do it.',   false, now()-interval '330 minute'),
  ('demo-msg-10','demo-cust-naic','customer','How much for a new battery on the God Super?', false, now()-interval '4 hour'),
  ('demo-msg-11','demo-cust-gma','customer','Is the Lucky Bee available in blue?',         true,  now()-interval '2 day'),
  ('demo-msg-12','demo-cust-gma','staff','Currently red and black only.',                 true,  now()-interval '47 hour'),
  ('demo-msg-13','demo-cust-gma','customer','Okay, I''ll take red. Thanks!',              false, now()-interval '1 hour'),
  ('demo-msg-14','demo-cust-tejero','customer','Warranty question about the motor controller.', false, now()-interval '8 hour')
on conflict (id) do nothing;


-- ---------- Existing models: On Sale / New flags (reset by cleanup) ----------
insert into model_meta (id, on_sale, sale_cash, is_new, sort) values
  ('lucky-agila-v2',    true,  129000, false, 0),
  ('lucky-lion-e-car',  false, null,   true,  0),
  ('honor-v1',          true,  79900,  true,  0),
  ('honor-v3',          false, null,   true,  0),
  ('lucky-eagle',       true,  37900,  false, 0),
  ('lucky-god-super-v3',false, null,   true,  0),
  ('lucky-bee',         true,  37500,  false, 0),
  ('big-cargo',         true,  74900,  false, 0),
  ('kt31s',             false, null,   true,  0)
on conflict (id) do update set on_sale = excluded.on_sale, sale_cash = excluded.sale_cash, is_new = excluded.is_new;


-- ---------- A custom BRAND-NEW model (2 colours) ----------
insert into model_meta (id, name, wheels, motor_w, battery, brakes, srp, is_custom, is_new, sort) values
  ('demo-model-citycruiser','City Cruiser (Demo)','2-wheels',800,'60V/24AH Lithium','Front & Rear Disc',54000,true,true,1)
on conflict (id) do nothing;
insert into model_variants (id, model_id, name, color_hex, stock, sort) values
  ('demo-var-cc-blue','demo-model-citycruiser','Blue','#1f6fd4',0,0),
  ('demo-var-cc-white','demo-model-citycruiser','White','#e8e8e8',0,1)
on conflict (id) do nothing;


-- ---------- Pre-loved (1-of-1) units across branches: on sale / plain / SOLD ----------
insert into model_meta (id, name, wheels, motor_w, battery, brakes, srp, is_custom, is_preloved, sold, color, chassis_no, battery_no, motor_no, on_sale, sale_cash, branch, sort) values
  ('demo-pl-1','Lucky Eagle (2023, Pre-loved)','2-wheels',1200,'60V/20AH Lead Acid','Front Disc / Rear Drum',22000,true,true,false,'Red','LLX-USED-1123','BAT-U-4410','MTR-U-8890', true, 19500, 'main', 0),
  ('demo-pl-2','God Super V2 (Pre-loved)','3-wheels',650,'60V/20AH Lead Acid','All Disc Brake',44000,true,true,false,'Black','LLX-USED-2244','BAT-U-1120','MTR-U-3320', false, null, 'trece', 1),
  ('demo-pl-3','K4004 V4 (Pre-loved, SOLD)','4-wheels',1500,'60V/20AH Lead Acid','Rear Drum',52000,true,true,true,'White','LLX-USED-3391','BAT-U-9982','MTR-U-2200', false, null, 'imus', 2),
  ('demo-pl-4','Lucky Turtle (Pre-loved)','2-wheels',1200,'60V/20AH Lead Acid','Front Disc / Rear Drum',26000,true,true,false,'Red','LLX-USED-4402','BAT-U-6610','MTR-U-7740', false, null, 'tanza', 3),
  ('demo-pl-5','Golf V+ V5 (Pre-loved)','4-wheels',1200,'60V/45AH Lead Acid','Rear Drum',58000,true,true,false,'Black','LLX-USED-5511','BAT-U-3320','MTR-U-1140', true, 52000, 'naic', 4),
  ('demo-pl-6','God Super V5 (Pre-loved, SOLD)','3-wheels',800,'60V/20AH Lead Acid','Front Disc / Rear Drum',40000,true,true,true,'Red','LLX-USED-6622','BAT-U-7730','MTR-U-9950', false, null, 'gma', 5)
on conflict (id) do nothing;


-- ---------- Per-branch brand-new stock (variant_stock) across all 7 branches ----------
-- Public store shows the company-wide total (sum of these); staff Inventory
-- edits their branch row. Some 0s so out-of-stock counts show too.
insert into variant_stock (variant_id, branch, stock) values
  -- MAIN
  ('lucky-agila-v2-red','main',8), ('lucky-agila-v2-black','main',3),
  ('honor-v1-red','main',10), ('honor-v1-black','main',4),
  ('lucky-eagle-red','main',0), ('lucky-eagle-black','main',6),
  ('lucky-deer-red','main',5), ('lucky-lion-e-car-red','main',2),
  -- IMUS
  ('lucky-lion-e-car-red','imus',3), ('kt31s-red','imus',5), ('kt31s-black','imus',2),
  ('honor-v3-black','imus',3), ('lucky-agila-v2-red','imus',4), ('honor-v3-red','imus',0),
  -- TRECE
  ('lucky-eagle-red','trece',2), ('lucky-eagle-black','trece',4),
  ('lucky-turtle-red','trece',6), ('lucky-god-super-v3-red','trece',3),
  ('lucky-god-super-v3-black','trece',0),
  -- TANZA
  ('big-cargo-red','tanza',2), ('big-cargo-black','tanza',1),
  ('lucky-golf-v-plus-v5-black','tanza',4), ('lucky-god-plus-r3-v2-red','tanza',3),
  -- NAIC
  ('lucky-god-super-v3-red','naic',4), ('lucky-sheep-plus-v8-black','naic',5),
  ('lucky-bee-black','naic',2), ('lucky-bee-red','naic',0),
  -- TEJERO
  ('honor-v3-red','tejero',3), ('honor-v3-black','tejero',2),
  ('lucky-god-super-v5-black','tejero',4),
  -- GMA
  ('lucky-bee-red','gma',6), ('lucky-deer-black','gma',4),
  ('lucky-turtle-red','gma',3), ('lucky-bee-black','gma',0),
  -- Custom demo model
  ('demo-var-cc-blue','main',4), ('demo-var-cc-white','main',2), ('demo-var-cc-blue','imus',3)
on conflict (variant_id, branch) do update set stock = excluded.stock;

-- =====================================================================
-- Done. Public site login: maria / maria123 (customer).
-- Staff portal (staff.html): any branch staff, e.g. rico / rico123.
-- Company oversight: admin / admin123 (Dashboard + Analytics).
-- =====================================================================
