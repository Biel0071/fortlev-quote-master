-- Customer profiles for /conta
create table if not exists public.customer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  full_name text null,
  whatsapp text null,
  cpf_cnpj text null,
  address_line text null,
  cep text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_profiles enable row level security;

-- Users can read their own profile
create policy "Customers can read own profile"
on public.customer_profiles
for select
using (auth.uid() = user_id);

-- Users can insert their own profile
create policy "Customers can create own profile"
on public.customer_profiles
for insert
with check (auth.uid() = user_id);

-- Users can update their own profile
create policy "Customers can update own profile"
on public.customer_profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Admins can manage profiles
create policy "Admins can manage customer profiles"
on public.customer_profiles
for all
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));

-- Keep updated_at in sync
drop trigger if exists set_customer_profiles_updated_at on public.customer_profiles;
create trigger set_customer_profiles_updated_at
before update on public.customer_profiles
for each row
execute function public.set_updated_at();

create index if not exists idx_customer_profiles_user_id on public.customer_profiles(user_id);


-- Order tracking events (for /rastreio/:id)
create table if not exists public.store_order_tracking (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id) on delete cascade,
  status text not null,
  detail text null,
  created_at timestamptz not null default now()
);

alter table public.store_order_tracking enable row level security;

create index if not exists idx_store_order_tracking_order_id on public.store_order_tracking(order_id);

-- Admins manage tracking
create policy "Admins can manage order tracking"
on public.store_order_tracking
for all
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));

-- Customers can read tracking for their own orders (by email on the order)
create policy "Customers can read own order tracking"
on public.store_order_tracking
for select
using (
  exists (
    select 1
    from public.store_orders o
    where o.id = store_order_tracking.order_id
      and lower(coalesce(o.customer_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);


-- Customers can read their own orders (by email)
create policy "Customers can read own orders"
on public.store_orders
for select
using (lower(coalesce(customer_email, '')) = lower(coalesce(auth.jwt() ->> 'email', '')));

create index if not exists idx_store_orders_customer_email on public.store_orders(lower(customer_email));

-- Customers can read their own order items (through order ownership)
create policy "Customers can read own order items"
on public.store_order_items
for select
using (
  exists (
    select 1
    from public.store_orders o
    where o.id = store_order_items.order_id
      and lower(coalesce(o.customer_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);
