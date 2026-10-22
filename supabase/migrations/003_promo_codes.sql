-- TeexFlow: promo codes that give full access (Pro) for free, e.g. for the
-- first 100 users. Run once in the Supabase SQL editor, after
-- 002_access_grants.sql. Safe to re-run.
--
-- Claiming a code adds (or extends) an access grant for the user's email, so
-- it works exactly like the grants made by hand on /dashboard/admin.

create table if not exists public.promo_codes (
  code             text primary key check (code = upper(code)),
  access_days      integer check (access_days is null or access_days > 0),   -- null: free for good
  max_redemptions  integer not null default 100 check (max_redemptions > 0),
  redeemed_count   integer not null default 0,
  redeem_by        timestamptz,                                              -- last moment it can be claimed
  active           boolean not null default true,
  note             text,
  created_by       text,
  created_at       timestamptz not null default now()
);

create table if not exists public.promo_redemptions (
  code         text not null references public.promo_codes (code) on delete cascade,
  user_id      text not null,
  email        text not null,
  redeemed_at  timestamptz not null default now(),
  primary key (code, user_id)
);

alter table public.promo_codes enable row level security;
alter table public.promo_redemptions enable row level security;

-- Claims a code for one user, all-or-nothing. The code row is locked while
-- it runs, so two people claiming the last place can't both get it.
create or replace function public.redeem_promo(p_code text, p_user_id text, p_email text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  pc public.promo_codes;
  current_until timestamptz;
  new_until timestamptz;
begin
  select * into pc from public.promo_codes where code = upper(trim(p_code)) for update;
  if not found or not pc.active then
    return json_build_object('ok', false, 'error', 'invalid');
  end if;
  if pc.redeem_by is not null and pc.redeem_by < now() then
    return json_build_object('ok', false, 'error', 'expired');
  end if;
  if exists (select 1 from public.promo_redemptions where code = pc.code and user_id = p_user_id) then
    return json_build_object('ok', false, 'error', 'used');
  end if;
  if pc.redeemed_count >= pc.max_redemptions then
    return json_build_object('ok', false, 'error', 'full');
  end if;

  select expires_at into current_until from public.access_grants where email = lower(p_email);
  if pc.access_days is null then
    new_until := timestamptz '2100-01-01 00:00:00+00';
  else
    -- Time left on an existing grant is kept; the code adds to it.
    new_until := greatest(coalesce(current_until, now()), now()) + make_interval(days => pc.access_days);
  end if;

  if current_until is null or new_until > current_until then
    insert into public.access_grants (email, expires_at, note, granted_by, updated_at)
    values (lower(p_email), new_until, 'Promo code ' || pc.code, 'promo:' || pc.code, now())
    on conflict (email) do update
      set expires_at = excluded.expires_at, note = excluded.note, granted_by = excluded.granted_by, updated_at = now();
  else
    new_until := current_until;
  end if;

  insert into public.promo_redemptions (code, user_id, email) values (pc.code, p_user_id, lower(p_email));
  update public.promo_codes set redeemed_count = redeemed_count + 1 where code = pc.code;
  return json_build_object('ok', true, 'until', new_until);
end;
$$;

-- Only the server (secret key) may call it.
revoke all on function public.redeem_promo(text, text, text) from public, anon, authenticated;
grant execute on function public.redeem_promo(text, text, text) to service_role;
