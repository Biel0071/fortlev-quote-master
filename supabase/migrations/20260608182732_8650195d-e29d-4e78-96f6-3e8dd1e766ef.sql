-- Phase 1: Core SaaS Schema (Safe & Robust)

-- 1. Create Tenants Table
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    plan_type TEXT DEFAULT 'free',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Ensure Stores Table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE table_schema = 'public' AND table_name = 'stores') THEN
        CREATE TABLE public.stores (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            description TEXT,
            logo_url TEXT,
            status TEXT DEFAULT 'active',
            is_template BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );
    END IF;
END $$;

-- 3. Ensure Stores has tenant_id
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_schema = 'public' AND table_name = 'stores' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.stores ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Create Auxiliary Tables
CREATE TABLE IF NOT EXISTS public.store_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    domain TEXT UNIQUE NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    ssl_status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    module_key TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(store_id, module_key)
);

CREATE TABLE IF NOT EXISTS public.store_themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE UNIQUE,
    colors JSONB DEFAULT '{"primary": "#000000", "secondary": "#ffffff"}'::jsonb,
    fonts JSONB DEFAULT '{"heading": "Inter", "body": "Inter"}'::jsonb,
    layout_settings JSONB DEFAULT '{}',
    custom_css TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_ai_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE UNIQUE,
    provider TEXT DEFAULT 'openai',
    model TEXT DEFAULT 'gpt-4o',
    persona TEXT,
    instructions TEXT,
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Population and Safe Column Injection
DO $$ 
DECLARE
    default_tenant_id UUID;
    default_store_id UUID;
BEGIN
    -- Ensure Default Tenant
    INSERT INTO public.tenants (name) 
    SELECT 'Default Tenant'
    WHERE NOT EXISTS (SELECT 1 FROM public.tenants LIMIT 1)
    RETURNING id INTO default_tenant_id;

    IF default_tenant_id IS NULL THEN
        SELECT id INTO default_tenant_id FROM public.tenants LIMIT 1;
    END IF;

    -- Ensure Default Store
    IF NOT EXISTS (SELECT 1 FROM public.stores LIMIT 1) THEN
        INSERT INTO public.stores (tenant_id, name, slug) 
        VALUES (default_tenant_id, 'Main Store', 'main-store') 
        RETURNING id INTO default_store_id;
    ELSE
        SELECT id INTO default_store_id FROM public.stores LIMIT 1;
        UPDATE public.stores SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    END IF;

    -- Safe Injection for Products
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE table_schema = 'public' AND table_name = 'products') THEN
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'store_id') THEN
            ALTER TABLE public.products ADD COLUMN store_id UUID REFERENCES public.stores(id) DEFAULT default_store_id;
        END IF;
    END IF;

    -- Safe Injection for Categories
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE table_schema = 'public' AND table_name = 'categories') THEN
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'store_id') THEN
            ALTER TABLE public.categories ADD COLUMN store_id UUID REFERENCES public.stores(id) DEFAULT default_store_id;
        END IF;
    END IF;

    -- Safe Injection for Orders
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE table_schema = 'public' AND table_name = 'orders') THEN
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'store_id') THEN
            ALTER TABLE public.orders ADD COLUMN store_id UUID REFERENCES public.stores(id) DEFAULT default_store_id;
        END IF;
    END IF;

    -- Safe Injection for Offers
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE table_schema = 'public' AND table_name = 'offers') THEN
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_schema = 'public' AND table_name = 'offers' AND column_name = 'store_id') THEN
            ALTER TABLE public.offers ADD COLUMN store_id UUID REFERENCES public.stores(id) DEFAULT default_store_id;
        END IF;
    END IF;
END $$;

-- 6. Grants and Security
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
GRANT SELECT ON public.tenants TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
GRANT SELECT ON public.stores TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_domains TO authenticated;
GRANT ALL ON public.store_domains TO service_role;
GRANT SELECT ON public.store_domains TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_modules TO authenticated;
GRANT ALL ON public.store_modules TO service_role;
GRANT SELECT ON public.store_modules TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_themes TO authenticated;
GRANT ALL ON public.store_themes TO service_role;
GRANT SELECT ON public.store_themes TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_ai_configs TO authenticated;
GRANT ALL ON public.store_ai_configs TO service_role;
GRANT SELECT ON public.store_ai_configs TO anon;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_ai_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public stores are viewable by everyone" ON public.stores FOR SELECT USING (true);
CREATE POLICY "Public domains are viewable by everyone" ON public.store_domains FOR SELECT USING (true);
CREATE POLICY "Public themes are viewable by everyone" ON public.store_themes FOR SELECT USING (true);
CREATE POLICY "Public modules are viewable by everyone" ON public.store_modules FOR SELECT USING (true);
CREATE POLICY "Public tenants are viewable by everyone" ON public.tenants FOR SELECT USING (true);
CREATE POLICY "Public AI configs are viewable by everyone" ON public.store_ai_configs FOR SELECT USING (true);
