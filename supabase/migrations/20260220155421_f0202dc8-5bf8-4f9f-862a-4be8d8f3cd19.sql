-- 1) Tracking events table
create table if not exists public.visitor_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  event_name text not null,
  path text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 2) Enable RLS
alter table public.visitor_events enable row level security;

-- 3) Policies
-- Public can insert events (no auth) but with basic validation
create policy "Public can insert visitor events"
on public.visitor_events
for insert
to public
with check (
  length(trim(session_id)) >= 8
  and length(trim(event_name)) > 0
  and event_name in ('chat_open','chat_message_sent','whatsapp_click','chat_close','chat_redirect_whatsapp')
);

-- Admins can read/manage
create policy "Admins can manage visitor events"
on public.visitor_events
for all
to public
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));

-- Helpful index
create index if not exists idx_visitor_events_session_time
on public.visitor_events (session_id, created_at desc);
create index if not exists idx_visitor_events_event_time
on public.visitor_events (event_name, created_at desc);