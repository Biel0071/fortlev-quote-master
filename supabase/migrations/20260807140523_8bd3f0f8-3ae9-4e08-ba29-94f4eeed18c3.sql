-- Corrigindo permissões para consulta pública de rastreio
GRANT SELECT ON public.order_tracking_main TO anon;
GRANT SELECT ON public.order_tracking_carriers TO anon;
GRANT SELECT ON public.order_tracking_status TO anon;
GRANT SELECT ON public.order_tracking_timeline TO anon;
GRANT SELECT ON public.store_orders TO anon;
GRANT SELECT ON public.store_order_items TO anon;

-- Criando políticas de acesso público (anônimo)
-- Nota: Usamos DROP POLICY IF EXISTS antes para garantir reentrância se necessário
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public can view tracking by code" ON public.order_tracking_main;
    DROP POLICY IF EXISTS "Public can view linked orders" ON public.store_orders;
    DROP POLICY IF EXISTS "Public can view carriers" ON public.order_tracking_carriers;
    DROP POLICY IF EXISTS "Public can view statuses" ON public.order_tracking_status;
    DROP POLICY IF EXISTS "Public can view timeline" ON public.order_tracking_timeline;
    DROP POLICY IF EXISTS "Public can view order items" ON public.store_order_items;
END $$;

CREATE POLICY "Public can view tracking by code" ON public.order_tracking_main 
  FOR SELECT TO anon USING (true);
    
CREATE POLICY "Public can view linked orders" ON public.store_orders 
  FOR SELECT TO anon USING (true);
    
CREATE POLICY "Public can view carriers" ON public.order_tracking_carriers 
  FOR SELECT TO anon USING (true);
    
CREATE POLICY "Public can view statuses" ON public.order_tracking_status 
  FOR SELECT TO anon USING (true);
    
CREATE POLICY "Public can view timeline" ON public.order_tracking_timeline 
  FOR SELECT TO anon USING (true);
    
CREATE POLICY "Public can view order items" ON public.store_order_items 
  FOR SELECT TO anon USING (true);
