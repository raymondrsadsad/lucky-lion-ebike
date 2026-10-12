-- staff-avatars.sql — profile pictures for staff accounts.
-- Adds an optional avatar image URL to users. Only staff set one in the UI;
-- customer rows simply leave it null. The image itself is stored in the shared
-- Supabase Storage bucket 'store-photos' (object names avatar-*.jpg), reusing the
-- same public bucket as store/model photos — so no new bucket or policy is needed.
--
-- Run this once in Supabase → SQL Editor.

alter table users add column if not exists avatar_url text;
