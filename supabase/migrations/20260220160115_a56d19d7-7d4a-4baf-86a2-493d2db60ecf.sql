-- Theme settings (single-row)
create table if not exists public.system_theme_settings (
  id uuid primary key default gen_random_uuid(),
  primary_color text not null default '#1E3A8A',
  primary_hover text not null default '#1E40AF',
  accent_color text not null default '#F97316',
  accent_hover text not null default '#EA580C',
  background_color text not null default '#F4F6F8',
  surface_color text not null default '#FFFFFF',
  text_primary text not null default '#111827',
  text_secondary text not null default '#6B7280',
  border_color text not null default '#E5E7EB',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.system_theme_settings enable row level security;

create policy "Public can read active theme settings"
on public.system_theme_settings
for select
to public
using (true);

create policy "Admins can manage theme settings"
on public.system_theme_settings
for all
to public
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));

-- Ensure updated_at updates
create trigger set_system_theme_settings_updated_at
before update on public.system_theme_settings
for each row execute function public.set_updated_at();

-- AI project reports
create table if not exists public.ai_project_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid null,
  mode text not null default 'quick',
  selected_scope text not null default 'src',
  report_json jsonb not null default '{}'::jsonb
);

alter table public.ai_project_reports enable row level security;

create policy "Admins can manage ai project reports"
on public.ai_project_reports
for all
to public
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));

create index if not exists idx_ai_project_reports_time on public.ai_project_reports (created_at desc);
create index if not exists idx_ai_project_reports_mode on public.ai_project_reports (mode);

-- Seed a single theme row if none exists
insert into public.system_theme_settings (
  primary_color, primary_hover, accent_color, accent_hover,
  background_color, surface_color,
  text_primary, text_secondary, border_color
)
select '#1E3A8A', '#1E40AF', '#F97316', '#EA580C', '#F4F6F8', '#FFFFFF', '#111827', '#6B7280', '#E5E7EB'
where not exists (select 1 from public.system_theme_settings);
