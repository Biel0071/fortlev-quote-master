-- Roles
create type public.app_role as enum ('admin');

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  )
$$;

create policy "Users can read their roles"
on public.user_roles
for select
to authenticated
using (auth.uid() = user_id);

create policy "Admins can manage roles"
on public.user_roles
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- Admin allowlist by email
create table if not exists public.admin_allowlist (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.admin_allowlist enable row level security;

create policy "Admins can read allowlist"
on public.admin_allowlist
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can manage allowlist"
on public.admin_allowlist
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- Products
create table if not exists public.store_products (
  id uuid primary key default gen_random_uuid(),
  source_id text unique, -- maps to existing constructionProducts ids
  name text not null,
  description text,
  category text,
  unit text,
  price numeric(12,2) not null default 0,
  stock integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.store_products enable row level security;

create policy "Public can read active products"
on public.store_products
for select
using (active = true);

create policy "Admins can manage products"
on public.store_products
for insert
to authenticated
with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update products"
on public.store_products
for update
to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete products"
on public.store_products
for delete
to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- Timestamp trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_store_products_updated_at on public.store_products;
create trigger trg_store_products_updated_at
before update on public.store_products
for each row execute function public.set_updated_at();

-- Product images (references storage objects)
create table if not exists public.store_product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.store_products(id) on delete cascade,
  path text not null, -- storage.objects.name
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.store_product_images enable row level security;

create policy "Public can read product images"
on public.store_product_images
for select
using (true);

create policy "Admins can manage product images"
on public.store_product_images
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create index if not exists idx_store_product_images_product_id on public.store_product_images(product_id);

-- Storage bucket for product images
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Storage policies
create policy "Public read product images"
on storage.objects
for select
using (bucket_id = 'product-images');

create policy "Admins upload product images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'product-images' and public.has_role(auth.uid(), 'admin'));

create policy "Admins update product images"
on storage.objects
for update
to authenticated
using (bucket_id = 'product-images' and public.has_role(auth.uid(), 'admin'));

create policy "Admins delete product images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'product-images' and public.has_role(auth.uid(), 'admin'));