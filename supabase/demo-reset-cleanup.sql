-- Lucky Lion — remove the demo-reset test seed, keeping the 3 demo logins.
-- Deletes the 5 dummy customers + all seeded repairs/e-bikes/messages.
-- Keeps admin/staff/user. Run in Supabase → SQL Editor.

delete from messages    where user_id in ('cust-maria','cust-rico','cust-ana','cust-ben','cust-cora') or id like 'm-%';
delete from user_ebikes where user_id in ('cust-maria','cust-rico','cust-ana','cust-ben','cust-cora') or id like 'eb-%';
delete from repairs     where id like 'rep-%';
delete from users       where id in ('cust-maria','cust-rico','cust-ana','cust-ben','cust-cora');
