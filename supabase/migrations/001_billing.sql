-- TeexFlow: Clerk users + Stripe billing.
-- Run once in the Supabase SQL editor (Dashboard → SQL → New query). Safe to re-run.
--
-- The app now signs users in with Clerk and talks to Supabase only from the
-- server using the secret key. User ids are Clerk ids (text, e.g. "user_2abc…"),
-- not Supabase auth uuids. RLS stays on with no policies, so the publishable
-- key can no longer read or write anything directly from a browser.

-- 1. Remove old browser-facing policies (they compare against auth.uid()).
do $$
declare p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in ('scripts', 'sessions', 'subscriptions')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

drop trigger if exists scripts_free_limit on public.scripts;
drop function if exists public.enforce_free_script_limit();
drop function if exists public.is_pro(uuid);

-- 2. scripts.user_id: uuid → text (Clerk id). Drops the FK to auth.users.
do $$
declare c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_attribute a on a.attrelid = con.conrelid and a.attnum = any (con.conkey)
    where con.conrelid = 'public.scripts'::regclass and con.contype = 'f' and a.attname = 'user_id'
  loop
    execute format('alter table public.scripts drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.scripts alter column user_id type text using user_id::text;
alter table public.scripts add column if not exists updated_at timestamptz default now();
create index if not exists scripts_user_updated_idx on public.scripts (user_id, updated_at desc);

-- 3. sessions: make sure the columns the controller uses exist.
alter table public.sessions add column if not exists settings jsonb not null default '{}'::jsonb;
alter table public.sessions add column if not exists scroll_percentage double precision not null default 0;
create unique index if not exists sessions_room_code_key on public.sessions (room_code);

-- 4. subscriptions: one row per Clerk user, written by the Stripe webhook.
create table if not exists public.subscriptions (
  user_id                text primary key,
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  status                 text not null default 'inactive',
  price_id               text,
  interval               text,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  updated_at             timestamptz not null default now()
);

do $$
declare c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_attribute a on a.attrelid = con.conrelid and a.attnum = any (con.conkey)
    where con.conrelid = 'public.subscriptions'::regclass and con.contype = 'f' and a.attname = 'user_id'
  loop
    execute format('alter table public.subscriptions drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.subscriptions alter column user_id type text using user_id::text;

-- 5. Lock tables to the server.
alter table public.scripts enable row level security;
alter table public.sessions enable row level security;
alter table public.subscriptions enable row level security;
