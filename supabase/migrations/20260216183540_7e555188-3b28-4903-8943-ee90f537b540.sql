-- Home departments (mixed: categories + custom links)
create table if not exists public.home_departments (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'link', -- 'link' | 'category'
  label text not null,
  icon text null,
  link_url text null,
  category_id uuid null references public.store_categories(id) on delete set null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.home_departments enable row level security;

create policy "Admins can manage home departments"
on public.home_departments
for all
using (public.has_role(auth.uid(), 'admin'::public.app_role))
with check (public.has_role(auth.uid(), 'admin'::public.app_role));

create policy "Public can read active home departments"
on public.home_departments
for select
using (active = true);

create trigger set_home_departments_updated_at
before update on public.home_departments
for each row execute function public.set_updated_at();

-- Home offers (curated weekly offers; UI can fallback to promo_price automatically)
create table if not exists public.home_offers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.store_products(id) on delete cascade,
  badge_text text null, -- e.g. 'OFERTA'
  promo_price numeric null, -- optional override; if null uses store_products.promo_price
  starts_at timestamptz null,
  ends_at timestamptz null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.home_offers enable row level security;

create policy "Admins can manage home offers"
on public.home_offers
for all
using (public.has_role(auth.uid(), 'admin'::public.app_role))
with check (public.has_role(auth.uid(), 'admin'::public.app_role));

create policy "Public can read active home offers"
on public.home_offers
for select
using (
  active = true
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
);

create trigger set_home_offers_updated_at
before update on public.home_offers
for each row execute function public.set_updated_at();

create index if not exists idx_home_offers_active_sort
on public.home_offers(active, sort_order);

-- Home SEO (single row: store home)
create table if not exists public.home_seo (
  id uuid primary key default gen_random_uuid(),
  key text not null unique, -- e.g. 'store_home'
  meta_title text null,
  meta_description text null,
  og_image_path text null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.home_seo enable row level security;

create policy "Admins can manage home seo"
on public.home_seo
for all
using (public.has_role(auth.uid(), 'admin'::public.app_role))
with check (public.has_role(auth.uid(), 'admin'::public.app_role));

create policy "Public can read active home seo"
on public.home_seo
for select
using (active = true);

create trigger set_home_seo_updated_at
before update on public.home_seo
for each row execute function public.set_updated_at();

-- Seed defaults if missing
insert into public.home_seo(key, meta_title, meta_description, active)
select 'store_home', 'Depósito de Materiais | Compre Online', 'Ofertas de materiais de construção com entrega rápida e compra segura. Adicione ao carrinho e finalize seu pedido.', true
where not exists (select 1 from public.home_seo where key = 'store_home');

insert into public.home_departments(kind, label, icon, link_url, sort_order, active)
select 'link', 'Ofertas', 'badge-percent', '/#ofertas', 0, true
where not exists (select 1 from public.home_departments where label = 'Ofertas');

insert into public.home_departments(kind, label, icon, link_url, sort_order, active)
select 'link', 'WhatsApp', 'message-circle', '/#whatsapp', 1, true
where not exists (select 1 from public.home_departments where label = 'WhatsApp');
