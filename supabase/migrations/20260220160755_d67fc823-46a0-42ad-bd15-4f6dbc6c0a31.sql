-- Extend visitor_sessions to support scoring flags/counters without storing PII
alter table public.visitor_sessions
  add column if not exists score_flags jsonb not null default '{}'::jsonb,
  add column if not exists counters jsonb not null default '{}'::jsonb;

create index if not exists idx_visitor_sessions_flags on public.visitor_sessions using gin (score_flags);
create index if not exists idx_visitor_sessions_counters on public.visitor_sessions using gin (counters);
