-- Fix RLS policies for PT-BR status on orders/items

-- store_orders: public insert must use status='aguardando'
DROP POLICY IF EXISTS "Public can create orders" ON public.store_orders;
CREATE POLICY "Public can create orders"
ON public.store_orders
FOR INSERT
WITH CHECK (
  status = 'aguardando'
  AND subtotal >= 0
  AND shipping >= 0
  AND total >= 0
  AND checkout_mode = ANY (ARRAY['whatsapp','gateway'])
);

-- store_order_items: public insert must reference orders with status='aguardando'
DROP POLICY IF EXISTS "Public can create order items" ON public.store_order_items;
CREATE POLICY "Public can create order items"
ON public.store_order_items
FOR INSERT
WITH CHECK (
  (quantity > 0)
  AND (price_snapshot >= 0)
  AND (line_total >= 0)
  AND (length(trim(both from name_snapshot)) > 0)
  AND (EXISTS (
    SELECT 1
    FROM public.store_orders o
    WHERE o.id = store_order_items.order_id
      AND o.status = 'aguardando'
      AND o.created_at > (now() - interval '02:00:00')
  ))
);