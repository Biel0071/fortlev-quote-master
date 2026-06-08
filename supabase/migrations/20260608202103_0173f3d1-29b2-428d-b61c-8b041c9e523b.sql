
-- 1. Remover defaults perigosos
ALTER TABLE public.store_products ALTER COLUMN store_id DROP DEFAULT;
ALTER TABLE public.store_banners ALTER COLUMN store_id DROP DEFAULT;
ALTER TABLE public.store_categories ALTER COLUMN store_id DROP DEFAULT;
ALTER TABLE public.store_pages ALTER COLUMN store_id DROP DEFAULT;

-- 2. Adicionar store_id em tabelas faltantes
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'store_orders' AND COLUMN_NAME = 'store_id') THEN
        ALTER TABLE public.store_orders ADD COLUMN store_id UUID REFERENCES public.stores(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'store_customers' AND COLUMN_NAME = 'store_id') THEN
        ALTER TABLE public.store_customers ADD COLUMN store_id UUID REFERENCES public.stores(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tracking_sessions' AND COLUMN_NAME = 'store_id') THEN
        ALTER TABLE public.tracking_sessions ADD COLUMN store_id UUID REFERENCES public.stores(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tracking_events' AND COLUMN_NAME = 'store_id') THEN
        ALTER TABLE public.tracking_events ADD COLUMN store_id UUID REFERENCES public.stores(id);
    END IF;
END $$;

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_store_orders_store_id ON public.store_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_store_customers_store_id ON public.store_customers(store_id);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_store_id ON public.tracking_sessions(store_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_store_id ON public.tracking_events(store_id);

-- 4. Garantir privilégios
GRANT ALL ON public.store_orders TO authenticated, service_role;
GRANT ALL ON public.store_customers TO authenticated, service_role;
GRANT ALL ON public.tracking_sessions TO authenticated, service_role;
GRANT ALL ON public.tracking_events TO authenticated, service_role;

-- 5. Atualizar políticas RLS
-- Pedidos
DROP POLICY IF EXISTS "Admins can read orders" ON public.store_orders;
DROP POLICY IF EXISTS "Store Isolation - Orders Admin Select" ON public.store_orders;
CREATE POLICY "Store Isolation - Orders Admin Select" ON public.store_orders
FOR SELECT USING (
    is_master_admin() OR 
    (EXISTS (SELECT 1 FROM saas_user_access u WHERE u.user_id = auth.uid() AND (u.tenant_id IN (SELECT tenant_id FROM stores s WHERE s.id = store_id))))
);

DROP POLICY IF EXISTS "Admins can update orders" ON public.store_orders;
DROP POLICY IF EXISTS "Store Isolation - Orders Admin Update" ON public.store_orders;
CREATE POLICY "Store Isolation - Orders Admin Update" ON public.store_orders
FOR UPDATE USING (
    is_master_admin() OR 
    (EXISTS (SELECT 1 FROM saas_user_access u WHERE u.user_id = auth.uid() AND (u.tenant_id IN (SELECT tenant_id FROM stores s WHERE s.id = store_id))))
);

-- Produtos (Atualizar as existentes)
DROP POLICY IF EXISTS "Store Isolation Select store_products" ON public.store_products;
DROP POLICY IF EXISTS "Store Isolation - Products Select" ON public.store_products;
CREATE POLICY "Store Isolation - Products Select" ON public.store_products
FOR SELECT USING (
    is_master_admin() OR 
    active = true OR
    (EXISTS (SELECT 1 FROM saas_user_access u WHERE u.user_id = auth.uid() AND (u.tenant_id IN (SELECT tenant_id FROM stores s WHERE s.id = store_id))))
);

-- Categorias
DROP POLICY IF EXISTS "Store Isolation Select store_categories" ON public.store_categories;
DROP POLICY IF EXISTS "Store Isolation - Categories Select" ON public.store_categories;
CREATE POLICY "Store Isolation - Categories Select" ON public.store_categories
FOR SELECT USING (
    is_master_admin() OR 
    active = true OR
    (EXISTS (SELECT 1 FROM saas_user_access u WHERE u.user_id = auth.uid() AND (u.tenant_id IN (SELECT tenant_id FROM stores s WHERE s.id = store_id))))
);
