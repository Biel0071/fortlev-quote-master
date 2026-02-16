-- 1) Storage buckets for separated assets
insert into storage.buckets (id, name, public)
values ('category-images','category-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('banner-images','banner-images', true)
on conflict (id) do nothing;

-- Public read (for storefront)
create policy "Public can read category images"
on storage.objects for select
using (bucket_id = 'category-images');

create policy "Public can read banner images"
on storage.objects for select
using (bucket_id = 'banner-images');

-- Admin manage (upload/edit/remove)
create policy "Admins can manage category images"
on storage.objects for all
using (bucket_id = 'category-images' and has_role(auth.uid(), 'admin'::app_role))
with check (bucket_id = 'category-images' and has_role(auth.uid(), 'admin'::app_role));

create policy "Admins can manage banner images"
on storage.objects for all
using (bucket_id = 'banner-images' and has_role(auth.uid(), 'admin'::app_role))
with check (bucket_id = 'banner-images' and has_role(auth.uid(), 'admin'::app_role));

-- 2) Extend categories
alter table public.store_categories
add column if not exists image_path text;

-- 3) Extend products (full catalog requirements)
alter table public.store_products
add column if not exists promo_price numeric not null default 0,
add column if not exists sku text,
add column if not exists min_stock integer not null default 0,
add column if not exists featured boolean not null default false,
add column if not exists best_seller boolean not null default false;

-- 4) Customers
create table if not exists public.store_customers (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  phone text,
  cep text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_store_customers_email on public.store_customers (email);
create index if not exists idx_store_customers_phone on public.store_customers (phone);

alter table public.store_customers enable row level security;

create policy "Admins can manage customers"
on public.store_customers
for all
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));

-- 5) Banners (home hero)
create table if not exists public.store_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_path text,
  link_url text,
  button_label text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_store_banners_active_sort on public.store_banners (active, sort_order);

alter table public.store_banners enable row level security;

create policy "Admins can manage banners"
on public.store_banners
for all
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));

create policy "Public can read active banners"
on public.store_banners
for select
using (active = true);

-- 6) Coupons
create table if not exists public.store_coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value numeric not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  min_subtotal numeric not null default 0,
  active boolean not null default true,
  max_uses integer,
  uses_count integer not null default 0,
  category_id uuid references public.store_categories(id) on delete set null,
  product_id uuid references public.store_products(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_store_coupons_active on public.store_coupons (active);
create index if not exists idx_store_coupons_code on public.store_coupons (code);

alter table public.store_coupons enable row level security;

create policy "Admins can manage coupons"
on public.store_coupons
for all
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));

-- 7) Offers (automatic promotions)
create table if not exists public.store_offers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value numeric not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  priority integer not null default 0,
  category_id uuid references public.store_categories(id) on delete set null,
  product_id uuid references public.store_products(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_store_offers_active on public.store_offers (active);

alter table public.store_offers enable row level security;

create policy "Admins can manage offers"
on public.store_offers
for all
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));

create policy "Public can read active offers"
on public.store_offers
for select
using (active = true);

-- 8) Orders: add customer + discount fields + pt-br statuses
alter table public.store_orders
add column if not exists customer_id uuid references public.store_customers(id) on delete set null,
add column if not exists discount numeric not null default 0,
add column if not exists coupon_code text;

-- 9) Automatic updated_at triggers
-- existing function: public.set_updated_at()

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_store_categories_updated_at') then
    create trigger trg_store_categories_updated_at
    before update on public.store_categories
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_store_products_updated_at') then
    create trigger trg_store_products_updated_at
    before update on public.store_products
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_store_orders_updated_at') then
    create trigger trg_store_orders_updated_at
    before update on public.store_orders
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_store_banners_updated_at') then
    create trigger trg_store_banners_updated_at
    before update on public.store_banners
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_store_customers_updated_at') then
    create trigger trg_store_customers_updated_at
    before update on public.store_customers
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_store_coupons_updated_at') then
    create trigger trg_store_coupons_updated_at
    before update on public.store_coupons
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_store_offers_updated_at') then
    create trigger trg_store_offers_updated_at
    before update on public.store_offers
    for each row execute function public.set_updated_at();
  end if;
end $$;

-- 10) Enforce PT-BR order statuses via trigger (avoid CHECK w/ future evolution)
create or replace function public.validate_store_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is null then
    raise exception 'status obrigatório';
  end if;

  if new.status not in ('aguardando','pago','separando','enviado','finalizado') then
    raise exception 'status inválido: %', new.status;
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_store_orders_validate_status') then
    create trigger trg_store_orders_validate_status
    before insert or update on public.store_orders
    for each row execute function public.validate_store_order_status();
  end if;
end $$;

-- 11) Coupon validation RPC (public)
create or replace function public.validate_coupon(
  _code text,
  _subtotal numeric,
  _product_id uuid,
  _category_id uuid
)
returns table(
  ok boolean,
  discount numeric,
  message text
)
language sql
stable
security definer
set search_path = public
as $$
  with c as (
    select *
    from public.store_coupons
    where lower(code) = lower(_code)
      and active = true
      and (_subtotal >= min_subtotal)
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at >= now())
      and (max_uses is null or uses_count < max_uses)
      and (product_id is null or product_id = _product_id)
      and (category_id is null or category_id = _category_id)
    limit 1
  )
  select
    (exists(select 1 from c)) as ok,
    coalesce(
      (select case
        when discount_type = 'percent' then greatest(0, least(_subtotal, _subtotal * (discount_value/100)))
        else greatest(0, least(_subtotal, discount_value))
      end from c),
      0
    ) as discount,
    case
      when exists(select 1 from c) then 'Cupom aplicado'
      else 'Cupom inválido ou expirado'
    end as message;
$$;

grant execute on function public.validate_coupon(text, numeric, uuid, uuid) to anon, authenticated;