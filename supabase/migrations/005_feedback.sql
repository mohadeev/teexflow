-- TeexFlow: feedback sent from the app's Feedback button. Read on
-- /dashboard/admin/feedback. Run once in the Supabase SQL editor. Safe to re-run.

create table if not exists public.feedback (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  user_id     text not null,
  email       text,
  kind        text not null default 'idea' check (kind in ('idea', 'problem', 'praise', 'other')),
  message     text not null check (char_length(message) between 1 and 5000),
  page        text,
  status      text not null default 'new' check (status in ('new', 'done'))
);
create index if not exists feedback_created_idx on public.feedback (created_at desc);
alter table public.feedback enable row level security;
