-- Adicionar store_id se não existir
ALTER TABLE public.store_order_tracking ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

-- Preencher store_id a partir das ordens se estiver nulo
UPDATE public.store_order_tracking t
SET store_id = o.store_id
FROM public.store_orders o
WHERE t.order_id = o.id AND t.store_id IS NULL;

-- Grants básicos
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_order_tracking TO authenticated;
GRANT ALL ON public.store_order_tracking TO service_role;

-- RLS
ALTER TABLE public.store_order_tracking ENABLE ROW LEVEL SECURITY;

-- Política para Administradores (usando rpc is_master_admin ou checagem de role se disponível no contexto de políticas, mas aqui focamos no acesso do usuário logado admin)
-- Como o sistema usa multi-tenant, admins podem ver tudo da sua loja ou se forem master
DROP POLICY IF EXISTS "Admins can manage tracking" ON public.store_order_tracking;
CREATE POLICY "Admins can manage tracking" ON public.store_order_tracking
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND role = 'admin')
);

-- Política para Clientes verem seu próprio rastreio
DROP POLICY IF EXISTS "Customers can view their own tracking" ON public.store_order_tracking;
CREATE POLICY "Customers can view their own tracking" ON public.store_order_tracking
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.store_orders 
    WHERE store_orders.id = store_order_tracking.order_id 
    AND store_orders.customer_id = auth.uid()
  )
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_tracking_order_id ON public.store_order_tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_tracking_store_id ON public.store_order_tracking(store_id);