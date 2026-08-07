-- Grant permissions to public tracking tables
GRANT SELECT ON public.order_tracking_main TO anon;
GRANT SELECT ON public.order_tracking_main TO authenticated;

GRANT SELECT ON public.order_tracking_carriers TO anon;
GRANT SELECT ON public.order_tracking_carriers TO authenticated;

GRANT SELECT ON public.order_tracking_status TO anon;
GRANT SELECT ON public.order_tracking_status TO authenticated;

GRANT SELECT ON public.order_tracking_timeline TO anon;
GRANT SELECT ON public.order_tracking_timeline TO authenticated;

GRANT SELECT ON public.store_orders TO anon;
GRANT SELECT ON public.store_orders TO authenticated;

GRANT SELECT ON public.store_order_items TO anon;
GRANT SELECT ON public.store_order_items TO authenticated;

-- Ensure RLS allows anonymous access
DROP POLICY IF EXISTS "Public can view orders by CPF or ID" ON public.store_orders;
CREATE POLICY "Public can view orders by CPF or ID" ON public.store_orders
FOR SELECT TO anon, authenticated
USING (true);
