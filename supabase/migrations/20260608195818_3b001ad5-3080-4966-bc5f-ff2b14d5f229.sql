-- 1. Helper para verificar Super Admin
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Tabela de Logs de Eventos do Sistema
CREATE TABLE IF NOT EXISTS public.system_event_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    severity TEXT DEFAULT 'info',
    actor_id UUID REFERENCES auth.users(id),
    tenant_id UUID REFERENCES public.tenants(id),
    store_id UUID REFERENCES public.stores(id),
    payload JSONB DEFAULT '{}'::jsonb,
    description TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT, INSERT ON public.system_event_logs TO authenticated;
GRANT ALL ON public.system_event_logs TO service_role;
ALTER TABLE public.system_event_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master Admins can view all system logs" 
ON public.system_event_logs FOR SELECT 
USING (public.is_master_admin());

-- 3. Melhoria na tabela store_domains
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_domains' AND column_name = 'is_fallback') THEN
        ALTER TABLE public.store_domains ADD COLUMN is_fallback BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_domains' AND column_name = 'ssl_active') THEN
        ALTER TABLE public.store_domains ADD COLUMN ssl_active BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_domains' AND column_name = 'last_check_at') THEN
        ALTER TABLE public.store_domains ADD COLUMN last_check_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 4. RLS para Stores (Master vê tudo)
DROP POLICY IF EXISTS "Master Admins can manage all stores" ON public.stores;
CREATE POLICY "Master Admins can manage all stores"
ON public.stores FOR ALL
TO authenticated
USING (public.is_master_admin())
WITH CHECK (public.is_master_admin());

-- 5. RLS para Tenants (Master vê tudo)
DROP POLICY IF EXISTS "Master Admins can view all tenants" ON public.tenants;
CREATE POLICY "Master Admins can view all tenants"
ON public.tenants FOR SELECT
TO authenticated
USING (public.is_master_admin());

-- 6. Grants e RLS para Financeiro
GRANT SELECT ON public.billing_invoices TO authenticated;
GRANT SELECT ON public.saas_subscriptions TO authenticated;
GRANT SELECT ON public.saas_plans TO authenticated;

ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Master can view all invoices" ON public.billing_invoices;
CREATE POLICY "Master can view all invoices" ON public.billing_invoices FOR SELECT USING (public.is_master_admin());

ALTER TABLE public.saas_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Master can view all subscriptions" ON public.saas_subscriptions;
CREATE POLICY "Master can view all subscriptions" ON public.saas_subscriptions FOR SELECT USING (public.is_master_admin());

ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Master can manage plans" ON public.saas_plans;
CREATE POLICY "Master can manage plans" ON public.saas_plans FOR ALL USING (public.is_master_admin());
