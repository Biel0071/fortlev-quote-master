-- Grant explicit SELECT to anon and authenticated
GRANT SELECT ON public.order_tracking_main TO anon, authenticated;
GRANT SELECT ON public.order_tracking_carriers TO anon, authenticated;
GRANT SELECT ON public.order_tracking_status TO anon, authenticated;
GRANT SELECT ON public.order_tracking_timeline TO anon, authenticated;
GRANT SELECT ON public.store_orders TO anon, authenticated;
GRANT SELECT ON public.store_order_items TO anon, authenticated;

-- Ensure RLS is enabled
ALTER TABLE public.order_tracking_main ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_tracking_carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_tracking_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_tracking_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_order_items ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (anonymous lookup)
DROP POLICY IF EXISTS "Public can view tracking by code" ON public.order_tracking_main;
CREATE POLICY "Public can view tracking by code" ON public.order_tracking_main FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public can view timeline" ON public.order_tracking_timeline;
CREATE POLICY "Public can view timeline" ON public.order_tracking_timeline FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public can view carriers" ON public.order_tracking_carriers;
CREATE POLICY "Public can view carriers" ON public.order_tracking_carriers FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public can view status" ON public.order_tracking_status;
CREATE POLICY "Public can view status" ON public.order_tracking_status FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public can view orders for tracking" ON public.store_orders;
CREATE POLICY "Public can view orders for tracking" ON public.store_orders FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public can view order items for tracking" ON public.store_order_items;
CREATE POLICY "Public can view order items for tracking" ON public.store_order_items FOR SELECT TO anon, authenticated USING (true);
