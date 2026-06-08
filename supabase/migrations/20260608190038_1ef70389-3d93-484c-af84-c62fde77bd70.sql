
-- 1. SaaS Plans
CREATE TABLE public.saas_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price_monthly NUMERIC DEFAULT 0,
    price_yearly NUMERIC DEFAULT 0,
    trial_days INTEGER DEFAULT 14,
    limits JSONB NOT NULL DEFAULT '{
        "max_stores": 1,
        "max_products": 50,
        "max_users": 2,
        "max_modules": 5,
        "max_automations": 2,
        "custom_domain": false,
        "white_label": false,
        "ai_enabled": true
    }',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. SaaS Subscriptions (Linking Tenants to Plans)
CREATE TABLE public.saas_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.saas_plans(id),
    status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'canceled', 'expired', 'incomplete')),
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '14 days'),
    cancel_at_period_end BOOLEAN DEFAULT false,
    gateway_subscription_id TEXT,
    gateway_customer_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(tenant_id)
);

-- 3. Tenant White Label settings
CREATE TABLE public.tenant_white_label (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    platform_name TEXT,
    logo_url TEXT,
    favicon_url TEXT,
    primary_color TEXT DEFAULT '#3b82f6',
    secondary_color TEXT DEFAULT '#1e293b',
    custom_domain TEXT,
    custom_domain_verified BOOLEAN DEFAULT false,
    support_email TEXT,
    support_phone TEXT,
    terms_url TEXT,
    privacy_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(tenant_id)
);

-- 4. Billing Invoices
CREATE TABLE public.billing_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    subscription_id UUID REFERENCES public.saas_subscriptions(id),
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'BRL',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'paid', 'uncollectible', 'void')),
    billing_reason TEXT,
    pdf_url TEXT,
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. RBAC Permissions
CREATE TABLE public.saas_rbac_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name TEXT NOT NULL,
    resource TEXT NOT NULL,
    action TEXT NOT NULL, -- 'read', 'write', 'delete', 'manage'
    is_allowed BOOLEAN DEFAULT true,
    UNIQUE(role_name, resource, action)
);

-- Seed Default Plans
INSERT INTO public.saas_plans (name, description, price_monthly, limits) VALUES
('Free', 'Para quem está começando', 0, '{
    "max_stores": 1,
    "max_products": 20,
    "max_users": 1,
    "max_modules": 2,
    "max_automations": 0,
    "custom_domain": false,
    "white_label": false,
    "ai_enabled": false
}'),
('Basic', 'Essencial para pequenas lojas', 97, '{
    "max_stores": 2,
    "max_products": 500,
    "max_users": 3,
    "max_modules": 10,
    "max_automations": 5,
    "custom_domain": true,
    "white_label": false,
    "ai_enabled": true
}'),
('Pro', 'Ideal para negócios em crescimento', 297, '{
    "max_stores": 10,
    "max_products": 5000,
    "max_users": 10,
    "max_modules": 50,
    "max_automations": 20,
    "custom_domain": true,
    "white_label": true,
    "ai_enabled": true
}'),
('Enterprise', 'Escalabilidade ilimitada', 997, '{
    "max_stores": 100,
    "max_products": 100000,
    "max_users": 100,
    "max_modules": 1000,
    "max_automations": 1000,
    "custom_domain": true,
    "white_label": true,
    "ai_enabled": true
}');

-- Grant Permissions
GRANT ALL ON public.saas_plans TO authenticated;
GRANT ALL ON public.saas_subscriptions TO authenticated;
GRANT ALL ON public.tenant_white_label TO authenticated;
GRANT ALL ON public.billing_invoices TO authenticated;
GRANT ALL ON public.saas_rbac_permissions TO authenticated;

GRANT ALL ON public.saas_plans TO service_role;
GRANT ALL ON public.saas_subscriptions TO service_role;
GRANT ALL ON public.tenant_white_label TO service_role;
GRANT ALL ON public.billing_invoices TO service_role;
GRANT ALL ON public.saas_rbac_permissions TO service_role;

-- Enable RLS
ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_white_label ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_rbac_permissions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public can view plans" ON public.saas_plans FOR SELECT USING (is_active = true);
CREATE POLICY "Tenants can view own subscription" ON public.saas_subscriptions FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.stores WHERE owner_id = auth.uid()));
CREATE POLICY "Tenants can view own white label" ON public.tenant_white_label FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.stores WHERE owner_id = auth.uid()));
CREATE POLICY "Tenants can manage own white label" ON public.tenant_white_label FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.stores WHERE owner_id = auth.uid()));
CREATE POLICY "Tenants can view own invoices" ON public.billing_invoices FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.stores WHERE owner_id = auth.uid()));
CREATE POLICY "RBAC is public" ON public.saas_rbac_permissions FOR SELECT USING (true);
