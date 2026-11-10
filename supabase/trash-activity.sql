-- trash-activity.sql — item 2: Trash Bin (soft delete) + Activity Log.
--
-- Run ONCE in Supabase → SQL Editor. Idempotent (safe to re-run).
--
-- After this runs, js/api.js detectTrash() flips soft-delete ON automatically:
--   • Deleting a customer / repair / e-bike unit sets deleted_at instead of
--     hard-deleting the row. The row disappears from every list (list queries
--     filter deleted_at IS NULL) but can be Restored from the admin Trash Bin,
--     or permanently removed there.
--   • Key actions (create / delete / restore / purge) are written to activity_log,
--     shown in the admin Activity Log view.
-- Until this is run, the app behaves exactly as before: permanent deletes, empty
-- Trash/Activity (no errors).

-- 1) Soft-delete marker on the three deletable tables.
alter table public.users       add column if not exists deleted_at timestamptz;
alter table public.repairs     add column if not exists deleted_at timestamptz;
alter table public.user_ebikes add column if not exists deleted_at timestamptz;

-- Partial indexes so the "not deleted" list filter stays fast.
create index if not exists users_not_deleted_idx       on public.users       (deleted_at) where deleted_at is null;
create index if not exists repairs_not_deleted_idx     on public.repairs     (deleted_at) where deleted_at is null;
create index if not exists user_ebikes_not_deleted_idx on public.user_ebikes (deleted_at) where deleted_at is null;

-- 2) Audit trail.
create table if not exists public.activity_log (
  id         text primary key,
  at         timestamptz not null default now(),
  actor      text,              -- who did it (name or username)
  actor_role text,              -- 'admin' | 'staff' | 'customer'
  action     text not null,     -- 'create' | 'delete' | 'restore' | 'purge'
  entity     text,              -- 'customer' | 'staff' | 'admin' | 'repair' | 'unit'
  entity_id  text,
  summary    text               -- human-readable line shown in the log
);
create index if not exists activity_log_at_idx on public.activity_log (at desc);

-- Prototype: open access via the anon key (same posture as every other table).
alter table public.activity_log enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'activity_log' and policyname = 'activity_log_all') then
    create policy activity_log_all on public.activity_log for all using (true) with check (true);
  end if;
end $$;
