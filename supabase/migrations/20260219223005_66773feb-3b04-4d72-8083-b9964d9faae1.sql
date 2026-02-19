-- Fortlev catalog products (for quotations)
create table if not exists public.fortlev_catalog_products (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  name text not null,
  capacity integer not null default 0,
  unit text not null default 'L',
  height text not null default '',
  diameter text not null default '',
  base_price numeric not null default 0,
  type text not null default 'caixa',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fortlev_catalog_products_active_idx on public.fortlev_catalog_products(active);
create index if not exists fortlev_catalog_products_type_idx on public.fortlev_catalog_products(type);

alter table public.fortlev_catalog_products enable row level security;

do $$ begin
  create policy "Public can read active Fortlev catalog products"
  on public.fortlev_catalog_products
  for select
  using (active = true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Admins can manage Fortlev catalog products"
  on public.fortlev_catalog_products
  for all
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));
exception when duplicate_object then null; end $$;

-- Construction catalog products (for quotations)
create table if not exists public.construction_catalog_products (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  name text not null,
  unit text not null default 'un',
  base_price numeric not null default 0,
  category text not null default 'outros',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists construction_catalog_products_active_idx on public.construction_catalog_products(active);
create index if not exists construction_catalog_products_category_idx on public.construction_catalog_products(category);

alter table public.construction_catalog_products enable row level security;

do $$ begin
  create policy "Public can read active construction catalog products"
  on public.construction_catalog_products
  for select
  using (active = true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Admins can manage construction catalog products"
  on public.construction_catalog_products
  for all
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));
exception when duplicate_object then null; end $$;

-- updated_at triggers
create trigger set_fortlev_catalog_products_updated_at
before update on public.fortlev_catalog_products
for each row execute function public.set_updated_at();

create trigger set_construction_catalog_products_updated_at
before update on public.construction_catalog_products
for each row execute function public.set_updated_at();
