-- Lucky Lion — pre-deploy DEMO RESET + rich test seed (2026-09-14)
-- Wipes users/repairs/user_ebikes/messages and reseeds the 3 demo logins
-- (admin/admin123, staff/staff123, user/user123) + 5 dummy customers with
-- e-bikes, repairs (every state) and message threads. Keeps models/photos/
-- variants/store_photos/site_settings untouched. Safe to re-run.
-- (This mirrors what was applied live via REST; passwords are plaintext by design.)

delete from messages    where id is not null;
delete from user_ebikes where id is not null;
delete from repairs     where id is not null;
delete from users       where id is not null;

-- ---- users ---------------------------------------------------------------
insert into users (id, member_id, role, branch, username, password, name, email, phone, address) values
 ('admin-1','ADMIN-01','admin',null,'admin','admin123','Owner / Admin','','',''),
 ('staff-1','TRECE-S-01','staff','trece','staff','staff123','Jared Lina','','0997-955-8909','Trece Martires, Cavite'),
 ('user-1','TRECE-C-0001','customer','trece','user','user123','Juan Dela Cruz','','0917-000-0000','Trece Martires, Cavite'),
 ('cust-maria','MAIN-C-0001','customer','main','maria','maria123','Maria Santos','','0917-111-1111','Buhay na Tubig, Imus, Cavite'),
 ('cust-rico','TRECE-C-0002','customer','trece','rico','rico123','Rico Reyes','','0917-222-2222','Trece Martires, Cavite'),
 ('cust-ana','IMUS-C-0001','customer','imus','ana','ana123','Ana Cruz','','0917-333-3333','Imus, Cavite'),
 ('cust-ben','TANZA-C-0001','customer','tanza','ben','ben123','Ben Tan','','0917-444-4444','Tanza, Cavite'),
 ('cust-cora','MAIN-C-0002','customer','main','cora','cora123','Cora Lim','','0917-555-5555','Bayan Luma, Imus, Cavite');

-- ---- owned e-bikes (registry + analytics fleet) --------------------------
insert into user_ebikes (id, user_id, model_id, variant_id, color, chassis_no, battery_no, motor_no, acquired_at, payment_mode, sale_price) values
 ('eb-u1a','user-1','lucky-agila-v2',null,'White','LLA2-2026-CH-00A1B2C3D4E5F6','BATT-72V45AH-0098771234','MTR-2000W-556677889900','2026-06-10','Cash',141600),
 ('eb-u1b','user-1','lucky-deer',null,'Red','LDR-2026-CH-11Z2Y3X4W5V6U7','BATT-48V20AH-0055443322','MTR-800W-112233445566','2026-08-01','Home Credit',29500),
 ('eb-m1','cust-maria','honor-v3',null,'Black','HNR3-2026-CH-22M3N4B5V6C7X8','BATT-72V40AH-0011223344','MTR-1500W-778899001122','2026-07-15','Cash',159300),
 ('eb-r1','cust-rico','lucky-god-super-v5',null,'Blue','LGS5-2026-CH-33Q4W5E6R7T8Y9','BATT-60V32AH-0044556677','MTR-1200W-334455667788','2026-05-20','Credit Card',64900),
 ('eb-a1','cust-ana','lucky-eagle',null,'Green','LEG-2026-CH-44A5S6D7F8G9H0','BATT-48V24AH-0066778899','MTR-1000W-990011223344','2026-08-20','Cash',42480),
 ('eb-b1','cust-ben','big-cargo',null,'Yellow','BCG-2026-CH-55J6K7L8Z9X0C1','BATT-60V45AH-0022334455','MTR-1500W-667788990011','2026-04-05','Home Credit',82600),
 ('eb-c1','cust-cora','lucky-turtle',null,'Silver','LTR-2026-CH-66P7O8I9U0Y1T2','BATT-48V20AH-0099887766','MTR-800W-445566778899','2026-09-01','Cash',41300);

-- ---- repairs (today = 2026-09-14; slots use an en-dash) -------------------
insert into repairs (id, user_id, model_id, date, time_slot, status, repair_type, notes, cost, completed_at) values
 ('rep-1','user-1','lucky-agila-v2','2026-09-14','10:00–12:00','pending','Tune-up','Brake adjustment + check throttle',null,null),
 ('rep-2','cust-ben','big-cargo','2026-09-14','13:00–15:00','pending','Battery check','Range dropped, inspect cells',null,null),
 ('rep-3','cust-maria','honor-v3','2026-09-15','08:00–10:00','pending','Diagnostics','Motor makes noise at low speed',null,null),
 ('rep-4','cust-rico','lucky-god-super-v5','2026-09-13','10:00–12:00','in-progress','Controller','Replacing controller, waiting bench test',null,null),
 ('rep-5','cust-ana','lucky-eagle','2026-09-10','13:00–15:00','done','Tire','Front tire replacement',850,'2026-09-10T15:30:00Z'),
 ('rep-6','user-1','lucky-deer','2026-09-05','08:00–10:00','done','General service','Full check + lube',500,'2026-09-05T09:40:00Z'),
 ('rep-7','cust-cora','lucky-turtle','2026-09-08','15:00–17:00','cancelled','Brakes','Customer rescheduled to next month',null,null),
 ('rep-8','cust-rico','lucky-god-super-v5','2026-09-02','10:00–12:00','pending','Parts','Waiting for spare part to arrive',null,null);

-- ---- message threads (some customer msgs left unread → inbox badge) -------
insert into messages (id, user_id, sender, body, read, created_at) values
 ('m-u1','user-1','customer','Hi, is my Agila V2 ready for pickup?',false,'2026-09-14T01:10:00Z'),
 ('m-u2','user-1','staff','Hello Juan! It''s being tuned, ready by tomorrow noon.',true,'2026-09-14T01:20:00Z'),
 ('m-u3','user-1','customer','Thank you! I''ll drop by.',false,'2026-09-14T01:25:00Z'),
 ('m-m1','cust-maria','customer','Do you have the Honor V3 available in black?',false,'2026-09-13T06:00:00Z'),
 ('m-m2','cust-maria','staff','Yes ma''am, available at the Main branch.',true,'2026-09-13T06:15:00Z'),
 ('m-c1','cust-cora','customer','I''d like to reschedule my repair, is that ok?',false,'2026-09-12T08:00:00Z'),
 ('m-c2','cust-cora','staff','Noted po, we cancelled the old slot. Just book again anytime.',true,'2026-09-12T08:30:00Z');
