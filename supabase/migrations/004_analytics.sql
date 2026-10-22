-- TeexFlow: first-party analytics (no third-party tracker, no IP addresses
-- stored). Run once in the Supabase SQL editor. Safe to re-run.
--
--   analytics_sessions: one row per visit — when it started, when it was last
--                       seen (live now / time on site), country, device, pages.
--   analytics_events:   page views and actions (script_created, voice_on…),
--                       tied to the account when signed in.

create table if not exists public.analytics_sessions (
  session_id     text primary key,
  visitor_id     text not null,
  user_id        text,
  started_at     timestamptz not null default now(),
  last_seen      timestamptz not null default now(),
  landing_path   text,
  current_path   text,
  referrer       text,
  country        text,
  device         text,
  browser        text,
  os             text,
  pageviews      integer not null default 0
);
create index if not exists analytics_sessions_last_seen_idx on public.analytics_sessions (last_seen desc);
create index if not exists analytics_sessions_started_idx on public.analytics_sessions (started_at desc);
create index if not exists analytics_sessions_user_idx on public.analytics_sessions (user_id, last_seen desc);

create table if not exists public.analytics_events (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  session_id  text not null,
  visitor_id  text not null,
  user_id     text,
  name        text not null,          -- "pageview" or an action
  path        text,
  props       jsonb
);
create index if not exists analytics_events_at_idx on public.analytics_events (at desc);
create index if not exists analytics_events_user_idx on public.analytics_events (user_id, at desc);
create index if not exists analytics_events_name_idx on public.analytics_events (name, at desc);

alter table public.analytics_sessions enable row level security;
alter table public.analytics_events enable row level security;

-- Creates or refreshes a visit in one step.
create or replace function public.analytics_touch(
  p_session text, p_visitor text, p_user text, p_path text, p_referrer text,
  p_country text, p_device text, p_browser text, p_os text, p_pageview boolean
) returns void
language sql
security definer
set search_path = public
as $$
  insert into public.analytics_sessions as s
    (session_id, visitor_id, user_id, landing_path, current_path, referrer, country, device, browser, os, pageviews)
  values
    (p_session, p_visitor, p_user, p_path, p_path, p_referrer, p_country, p_device, p_browser, p_os, case when p_pageview then 1 else 0 end)
  on conflict (session_id) do update set
    last_seen    = now(),
    current_path = coalesce(p_path, s.current_path),
    user_id      = coalesce(p_user, s.user_id),
    pageviews    = s.pageviews + case when p_pageview then 1 else 0 end;
$$;

-- Everything the admin overview shows, for visits since p_from.
create or replace function public.analytics_summary(p_from timestamptz)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'visitors',   (select count(distinct visitor_id) from analytics_sessions where started_at >= p_from),
    'sessions',   (select count(*) from analytics_sessions where started_at >= p_from),
    'pageviews',  (select coalesce(sum(pageviews), 0) from analytics_sessions where started_at >= p_from),
    'avg_seconds',(select coalesce(avg(extract(epoch from last_seen - started_at)), 0)::int from analytics_sessions where started_at >= p_from),
    'signed_in',  (select count(distinct user_id) from analytics_sessions where started_at >= p_from and user_id is not null),
    'countries',  (select coalesce(json_agg(t), '[]') from (select coalesce(country, '??') as key, count(*) as n from analytics_sessions where started_at >= p_from group by 1 order by 2 desc limit 15) t),
    'devices',    (select coalesce(json_agg(t), '[]') from (select coalesce(device, 'unknown') as key, count(*) as n from analytics_sessions where started_at >= p_from group by 1 order by 2 desc) t),
    'browsers',   (select coalesce(json_agg(t), '[]') from (select coalesce(browser, 'unknown') as key, count(*) as n from analytics_sessions where started_at >= p_from group by 1 order by 2 desc limit 8) t),
    'referrers',  (select coalesce(json_agg(t), '[]') from (select coalesce(nullif(referrer, ''), 'Direct') as key, count(*) as n from analytics_sessions where started_at >= p_from group by 1 order by 2 desc limit 10) t),
    'landing',    (select coalesce(json_agg(t), '[]') from (select coalesce(landing_path, '/') as key, count(*) as n from analytics_sessions where started_at >= p_from group by 1 order by 2 desc limit 10) t),
    'pages',      (select coalesce(json_agg(t), '[]') from (select coalesce(path, '/') as key, count(*) as n from analytics_events where name = 'pageview' and at >= p_from group by 1 order by 2 desc limit 15) t),
    'actions',    (select coalesce(json_agg(t), '[]') from (select name as key, count(*) as n from analytics_events where name <> 'pageview' and at >= p_from group by 1 order by 2 desc limit 15) t),
    'daily',      (select coalesce(json_agg(t order by t.day), '[]') from (select date_trunc('day', started_at)::date as day, count(distinct visitor_id) as visitors from analytics_sessions where started_at >= p_from group by 1) t)
  );
$$;

revoke all on function public.analytics_touch(text, text, text, text, text, text, text, text, text, boolean) from public, anon, authenticated;
revoke all on function public.analytics_summary(timestamptz) from public, anon, authenticated;
grant execute on function public.analytics_touch(text, text, text, text, text, text, text, text, text, boolean) to service_role;
grant execute on function public.analytics_summary(timestamptz) to service_role;
