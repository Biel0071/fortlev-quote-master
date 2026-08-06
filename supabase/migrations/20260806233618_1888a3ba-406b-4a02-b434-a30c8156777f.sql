-- Permitir que qualquer pessoa consulte o rastreio (público)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public can view tracking' AND tablename = 'order_tracking_main'
    ) THEN
        CREATE POLICY "Public can view tracking" ON public.order_tracking_main FOR SELECT TO anon, authenticated USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public can view timeline' AND tablename = 'order_tracking_timeline'
    ) THEN
        CREATE POLICY "Public can view timeline" ON public.order_tracking_timeline FOR SELECT TO anon, authenticated USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public can view status' AND tablename = 'order_tracking_status'
    ) THEN
        CREATE POLICY "Public can view status" ON public.order_tracking_status FOR SELECT TO anon, authenticated USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public can view carriers' AND tablename = 'order_tracking_carriers'
    ) THEN
        CREATE POLICY "Public can view carriers" ON public.order_tracking_carriers FOR SELECT TO anon, authenticated USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public can view orders for tracking' AND tablename = 'store_orders'
    ) THEN
        CREATE POLICY "Public can view orders for tracking" ON public.store_orders FOR SELECT TO anon, authenticated USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public can view items for tracking' AND tablename = 'store_order_items'
    ) THEN
        CREATE POLICY "Public can view items for tracking" ON public.store_order_items FOR SELECT TO anon, authenticated USING (true);
    END IF;
END $$;

-- Garantir GRANTS para anon
GRANT SELECT ON public.order_tracking_main TO anon;
GRANT SELECT ON public.order_tracking_timeline TO anon;
GRANT SELECT ON public.order_tracking_status TO anon;
GRANT SELECT ON public.order_tracking_carriers TO anon;
GRANT SELECT ON public.store_orders TO anon;
GRANT SELECT ON public.store_order_items TO anon;
