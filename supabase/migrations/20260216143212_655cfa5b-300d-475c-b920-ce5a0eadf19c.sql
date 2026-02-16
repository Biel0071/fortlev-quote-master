-- Fix permissive INSERT policies (avoid WITH CHECK (true))

-- store_orders
drop policy if exists "Public can create orders" on public.store_orders;
create policy "Public can create orders"
on public.store_orders
for insert
with check (
  status = 'pending'
  and subtotal >= 0
  and shipping >= 0
  and total >= 0
  and checkout_mode in ('whatsapp','gateway')
);

-- store_order_items
drop policy if exists "Public can create order items" on public.store_order_items;
create policy "Public can create order items"
on public.store_order_items
for insert
with check (
  quantity > 0
  and price_snapshot >= 0
  and line_total >= 0
  and length(trim(name_snapshot)) > 0
  and exists (
    select 1
    from public.store_orders o
    where o.id = order_id
      and o.status = 'pending'
      and o.created_at > now() - interval '2 hours'
  )
);
