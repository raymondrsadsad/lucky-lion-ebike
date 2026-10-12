-- Lucky Lion — Phase 3: customer ↔ branch messaging (one thread per customer).
-- Paste into Supabase → SQL Editor → Run. Safe to re-run (idempotent).
--
-- `sender` is 'customer' or 'staff'. `read` = whether the OTHER side has seen it
-- (a customer message is unread until staff reads it, and vice-versa).

create table if not exists messages (
  id         text primary key,
  user_id    text references users(id) on delete cascade,   -- the customer the thread belongs to
  sender     text not null,          -- 'customer' | 'staff'
  body       text not null,
  read       boolean default false,
  created_at timestamptz default now()
);
create index if not exists messages_user_idx on messages (user_id, created_at);

alter table messages enable row level security;
drop policy if exists "public_all_messages" on messages;
create policy "public_all_messages" on messages for all using (true) with check (true);
