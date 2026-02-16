-- Categories
create table if not exists public.store_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort_order int not null default 0,
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add category relationship to products (keep legacy text column for now)
alter table public.store_products
  add column if not exists category_id uuid;

alter table public.store_products
  add constraint store_products_category_id_fkey
  foreign key (category_id) references public.store_categories(id)
  on delete set null;

create index if not exists idx_store_products_category_id on public.store_products(category_id);
create index if not exists idx_store_categories_sort on public.store_categories(sort_order);

-- Institutional pages (CMS)
create table if not exists public.store_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  content_md text not null default '',
  published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_store_pages_sort on public.store_pages(sort_order);

-- Orders
create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending',
  customer_name text,
  customer_email text,
  customer_phone text,
  cep text,
  address text,
  notes text,
  subtotal numeric not null default 0,
  shipping numeric not null default 0,
  total numeric not null default 0,
  checkout_mode text not null default 'whatsapp',
  payment_method text,
  whatsapp_sent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_store_orders_created_at on public.store_orders(created_at desc);
create index if not exists idx_store_orders_status on public.store_orders(status);

create table if not exists public.store_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id) on delete cascade,
  product_id uuid references public.store_products(id) on delete set null,
  name_snapshot text not null,
  unit_snapshot text,
  price_snapshot numeric not null default 0,
  quantity int not null default 1,
  line_total numeric not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_store_order_items_order_id on public.store_order_items(order_id);

-- Triggers for updated_at
create trigger trg_store_categories_updated_at
before update on public.store_categories
for each row execute function public.set_updated_at();

create trigger trg_store_pages_updated_at
before update on public.store_pages
for each row execute function public.set_updated_at();

create trigger trg_store_orders_updated_at
before update on public.store_orders
for each row execute function public.set_updated_at();

-- Enable RLS
alter table public.store_categories enable row level security;
alter table public.store_pages enable row level security;
alter table public.store_orders enable row level security;
alter table public.store_order_items enable row level security;

-- Policies: Categories
create policy "Public can read active categories"
on public.store_categories
for select
using (active = true);

create policy "Admins can manage categories"
on public.store_categories
for all
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));

-- Policies: Pages
create policy "Public can read published pages"
on public.store_pages
for select
using (published = true);

create policy "Admins can manage pages"
on public.store_pages
for all
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));

-- Policies: Orders (public can create, only admins can read/manage)
create policy "Public can create orders"
on public.store_orders
for insert
with check (true);

create policy "Admins can read orders"
on public.store_orders
for select
using (has_role(auth.uid(), 'admin'::app_role));

create policy "Admins can update orders"
on public.store_orders
for update
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));

create policy "Admins can delete orders"
on public.store_orders
for delete
using (has_role(auth.uid(), 'admin'::app_role));

create policy "Public can create order items"
on public.store_order_items
for insert
with check (true);

create policy "Admins can read order items"
on public.store_order_items
for select
using (has_role(auth.uid(), 'admin'::app_role));

create policy "Admins can delete order items"
on public.store_order_items
for delete
using (has_role(auth.uid(), 'admin'::app_role));

create policy "Admins can update order items"
on public.store_order_items
for update
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));
