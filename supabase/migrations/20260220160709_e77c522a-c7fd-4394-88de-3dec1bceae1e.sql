-- =========================================================
-- LGPD tracking + chat insights (schema)
-- =========================================================

-- 1) Visitor sessions
create table if not exists public.visitor_sessions (
  id uuid primary key default gen_random_uuid(),
  session_token text not null unique,
  consent_given boolean not null default false,

  -- Only stored when consent_given = true
  ip text null,
  user_agent text null,
  referrer text null,
  utm_source text null,
  utm_campaign text null,
  country text null,

  score integer not null default 0,

  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  total_time integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.visitor_sessions enable row level security;

-- Admin-only access (via has_role)
create policy "Admins can manage visitor sessions"
on public.visitor_sessions
for all
to public
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));

create index if not exists idx_visitor_sessions_started_at on public.visitor_sessions (started_at desc);
create index if not exists idx_visitor_sessions_score on public.visitor_sessions (score desc);

create trigger set_visitor_sessions_updated_at
before update on public.visitor_sessions
for each row execute function public.set_updated_at();


-- 2) Visitor events (extend existing table safely)
-- Existing: visitor_events(session_id text, event_name text, path text, metadata jsonb, created_at)
alter table public.visitor_events
  add column if not exists type text null,
  add column if not exists product_id uuid null,
  add column if not exists category_id uuid null,
  add column if not exists duration integer null;

-- Keep the older event_name column; keep RLS already enabled.

-- Ensure admin can read/manage visitor_events too (if not already)
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname='public' and tablename='visitor_events' and policyname='Admins can manage visitor events'
  ) then
    create policy "Admins can manage visitor events"
    on public.visitor_events
    for all
    to public
    using (has_role(auth.uid(), 'admin'::app_role))
    with check (has_role(auth.uid(), 'admin'::app_role));
  end if;
end $$;

create index if not exists idx_visitor_events_type_time
on public.visitor_events (type, created_at desc);

create index if not exists idx_visitor_events_session_time
on public.visitor_events (session_id, created_at desc);


-- 3) Chat sessions + messages (admin-only; written by backend function)
create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  visitor_session_id uuid null references public.visitor_sessions(id) on delete set null,
  session_token text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  score_snapshot integer not null default 0,
  last_path text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.chat_sessions enable row level security;
create policy "Admins can manage chat sessions"
on public.chat_sessions
for all
to public
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));

create trigger set_chat_sessions_updated_at
before update on public.chat_sessions
for each row execute function public.set_updated_at();

create index if not exists idx_chat_sessions_time on public.chat_sessions (started_at desc);
create index if not exists idx_chat_sessions_token on public.chat_sessions (session_token);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_session_id uuid not null references public.chat_sessions(id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;
create policy "Admins can manage chat messages"
on public.chat_messages
for all
to public
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));

create index if not exists idx_chat_messages_session_time
on public.chat_messages (chat_session_id, created_at asc);


-- 4) Chat insights
create table if not exists public.chat_insights (
  id uuid primary key default gen_random_uuid(),
  chat_session_id uuid not null references public.chat_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  insight_json jsonb not null default '{}'::jsonb
);

alter table public.chat_insights enable row level security;
create policy "Admins can manage chat insights"
on public.chat_insights
for all
to public
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));

create index if not exists idx_chat_insights_time on public.chat_insights (created_at desc);


-- 5) Best conversations (manual/automatic flags)
create table if not exists public.best_conversations (
  id uuid primary key default gen_random_uuid(),
  chat_session_id uuid not null unique references public.chat_sessions(id) on delete cascade,
  reason text null,
  created_at timestamptz not null default now()
);

alter table public.best_conversations enable row level security;
create policy "Admins can manage best conversations"
on public.best_conversations
for all
to public
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));

create index if not exists idx_best_conversations_time on public.best_conversations (created_at desc);
