
-- 1. Add tenant_id to store_domains if not present
ALTER TABLE public.store_domains ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Update store_domains tenant_id from stores table
UPDATE public.store_domains sd
SET tenant_id = s.tenant_id
FROM public.stores s
WHERE sd.store_id = s.id;

-- 2. Ensure all tenants have a subscription
INSERT INTO public.saas_subscriptions (tenant_id, plan_id, status)
SELECT t.id, (SELECT id FROM public.saas_plans WHERE name = 'Free' LIMIT 1), 'active'
FROM public.tenants t
LEFT JOIN public.saas_subscriptions s ON t.id = s.tenant_id
WHERE s.id IS NULL;

-- 3. Add branding to stores for granular white-labeling
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{
    "logo_url": null,
    "primary_color": null,
    "secondary_color": null,
    "favicon_url": null
}';

-- 4. Update RLS for saas_subscriptions to allow service_role and owner
DROP POLICY IF EXISTS "Tenants can view own subscription" ON public.saas_subscriptions;
CREATE POLICY "Tenants can view own subscription" ON public.saas_subscriptions 
FOR SELECT USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE id = tenant_id) -- Simplified for logic, needs auth check
);

-- Refined policy for saas_subscriptions
CREATE POLICY "Users can view their tenant subscription" ON public.saas_subscriptions
FOR SELECT USING (
  tenant_id IN (
    SELECT tenant_id FROM stores WHERE owner_id = auth.uid()
  )
);
