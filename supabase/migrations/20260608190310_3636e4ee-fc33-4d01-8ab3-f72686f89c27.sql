
-- Create Role Type
DO $$ BEGIN
    CREATE TYPE public.saas_role AS ENUM ('owner', 'admin', 'manager', 'seller', 'support', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Advanced User Access Table
CREATE TABLE public.saas_user_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    role saas_role NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, tenant_id, store_id)
);

-- Grant Permissions
GRANT ALL ON public.saas_user_access TO authenticated;
GRANT ALL ON public.saas_user_access TO service_role;

-- Enable RLS
ALTER TABLE public.saas_user_access ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own access" ON public.saas_user_access
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Owners can manage access within tenant" ON public.saas_user_access
FOR ALL USING (
    tenant_id IN (
        SELECT tenant_id FROM public.saas_user_access 
        WHERE user_id = auth.uid() AND role = 'owner'
    )
);

-- Seed: Link existing store owners to saas_user_access (Safe version)
INSERT INTO public.saas_user_access (user_id, tenant_id, store_id, role)
SELECT owner_id, tenant_id, id, 'owner'
FROM public.stores
WHERE owner_id IS NOT NULL
ON CONFLICT DO NOTHING;
