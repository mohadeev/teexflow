-- TeexFlow: full access granted by an admin, by email, until a date.
-- Run once in the Supabase SQL editor (Dashboard → SQL → New query). Safe to re-run.
--
-- Written and read only by the server (secret key) from /dashboard/admin.
-- A grant applies to whichever account has that verified email, including
-- accounts created after the grant.

create table if not exists public.access_grants (
  email       text primary key check (email = lower(email)),
  expires_at  timestamptz not null,
  note        text,
  granted_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.access_grants enable row level security;
