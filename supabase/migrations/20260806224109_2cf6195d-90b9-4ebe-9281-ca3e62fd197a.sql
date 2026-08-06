-- Adicionar colunas se faltarem (redundância de segurança)
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS customer_cpf text;

-- Garantir privilégios para o painel administrativo
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_orders TO authenticated;
GRANT ALL ON public.store_orders TO service_role;

-- Ajustar políticas de RLS para permitir criação de pedidos "placeholder" pelo admin
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.store_orders;
CREATE POLICY "Admins can manage all orders" ON public.store_orders
    FOR ALL 
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Permitir que o admin crie rastreios livremente
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_tracking_main TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_tracking_timeline TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_tracking_carriers TO authenticated;
