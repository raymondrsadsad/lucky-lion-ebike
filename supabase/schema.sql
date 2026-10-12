-- Lucky Lion eBike — Supabase schema
-- Paste this whole file into Supabase → SQL Editor → New query → Run.

-- ============ TABLES ============
create table if not exists users (
  id            text primary key,
  member_id     text,
  role          text not null default 'customer',   -- 'customer' | 'staff'
  username      text unique not null,
  password      text,                                -- prototype only (see note)
  name          text,
  email         text,
  phone         text,
  address       text,
  owned_model_id text,
  created_at    timestamptz default now()
);

create table if not exists repairs (
  id         text primary key,
  user_id    text references users(id) on delete cascade,
  model_id   text,
  date       text,
  time_slot  text,
  status     text default 'pending',
  notes      text,
  created_at timestamptz default now()
);

-- ============ ACCESS POLICIES (demo: allow the public anon key) ============
-- NOTE: This is a prototype policy that lets the site read/write with the public
-- anon key, like the old localStorage version. Fine for a school demo. For real
-- production you'd tighten these and hash passwords / use Supabase Auth.
alter table users   enable row level security;
alter table repairs enable row level security;

drop policy if exists "public_all_users"   on users;
drop policy if exists "public_all_repairs" on repairs;
create policy "public_all_users"   on users   for all using (true) with check (true);
create policy "public_all_repairs" on repairs for all using (true) with check (true);

-- ============ SEED DEMO ACCOUNTS ============
insert into users (id, member_id, role, username, password, name, phone, address, owned_model_id) values
  ('staff-1','STAFF-0001','staff','staff','staff123','Jared Lina','0997-955-8909','Trece Martires City, Cavite', null),
  ('user-1','CUST-0001','customer','user','user123','Juan Dela Cruz','0917-000-0000','San Agustin, Trece Martires City, Cavite','lucky-agila-v2')
on conflict (id) do nothing;

insert into repairs (id, user_id, model_id, date, time_slot, status, notes) values
  ('rep-1','user-1','lucky-agila-v2', to_char(now() + interval '2 day','YYYY-MM-DD'), '10:00–12:00', 'pending', 'Front brake needs adjustment')
on conflict (id) do nothing;
