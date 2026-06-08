import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PlanLimits {
  max_stores: number;
  max_products: number;
  max_users: number;
  max_modules: number;
  max_automations: number;
  custom_domain: boolean;
  white_label: boolean;
  ai_enabled: boolean;
}

interface Plan {
  id: string;
  name: string;
  limits: PlanLimits;
}

interface Subscription {
  id: string;
  status: 'trial' | 'active' | 'past_due' | 'canceled' | 'expired' | 'incomplete';
  plan: Plan;
}

interface Tenant {
  id: string;
  name: string;
  subscription?: Subscription;
  whiteLabel?: any;
}

interface Store {
  id: string;
  name: string;
  slug: string;
  tenant_id: string;
}

interface TenantContextType {
  tenant: Tenant | null;
  store: Store | null;
  isLoading: boolean;
  error: string | null;
  hasFeature: (feature: keyof PlanLimits) => boolean;
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  store: null,
  isLoading: true,
  error: null,
  hasFeature: () => false,
});

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasFeature = (feature: keyof PlanLimits) => {
    if (!tenant?.subscription?.plan?.limits) return false;
    const limit = tenant.subscription.plan.limits[feature];
    if (typeof limit === 'boolean') return limit;
    return true; // For numeric limits, just existence means it has the feature capability
  };

  useEffect(() => {
    async function resolveStore() {
      try {
        const hostname = window.location.hostname;
        const pathParts = window.location.pathname.split('/');
        
        // 1. Resolve Store and Tenant
        let storeId: string | undefined;
        let tenantId: string | undefined;

        // Check if we are in a Master Admin session impersonating a store
        if (pathParts[1] === 'admin' && pathParts[2] === 'store' && pathParts[3]) {
          storeId = pathParts[3];
          // We'll fetch the store data below to get the tenantId
        }

        // Check domains table if not impersonating
        if (!storeId) {
          const { data: domainData } = await supabase
            .from('store_domains')
            .select('store_id, tenant_id')
            .eq('domain', hostname)
            .maybeSingle();

          storeId = domainData?.store_id;
          tenantId = domainData?.tenant_id;
        }

        // Fallback to slug if still not found
        if (!storeId) {
          const possibleSlug = pathParts[1];
          if (possibleSlug && !['admin', 'auth', 'master'].includes(possibleSlug)) {
             const { data: slugData } = await supabase
              .from('stores')
              .select('id, tenant_id')
              .eq('slug', possibleSlug)
              .maybeSingle();
             storeId = slugData?.id;
             tenantId = slugData?.tenant_id;
          }
        }

        // Final fallback: Get default
        if (!storeId) {
          const { data: defaultStore } = await supabase
            .from('stores')
            .select('id, name, slug, tenant_id')
            .limit(1)
            .single();
          
          if (defaultStore) {
            storeId = defaultStore.id;
            tenantId = defaultStore.tenant_id;
            setStore(defaultStore);
          }
        } else {
          const { data: storeData } = await supabase
            .from('stores')
            .select('id, name, slug, tenant_id')
            .eq('id', storeId)
            .single();
          setStore(storeData);
        }

        // 2. Fetch Tenant Data with Subscription and White Label
        if (tenantId) {
          const { data: tenantData } = await supabase
            .from('tenants')
            .select(`
              id, 
              name,
              saas_subscriptions (
                id,
                status,
                saas_plans (
                  id,
                  name,
                  limits
                )
              ),
              tenant_white_label (*)
            `)
            .eq('id', tenantId)
            .single();

          if (tenantData) {
            const sub = tenantData.saas_subscriptions?.[0];
            setTenant({
              id: tenantData.id,
              name: tenantData.name,
              subscription: sub ? {
                id: sub.id,
                status: sub.status,
                plan: {
                  id: sub.saas_plans.id,
                  name: sub.saas_plans.name,
                  limits: sub.saas_plans.limits as unknown as PlanLimits
                }
              } : undefined,
              whiteLabel: tenantData.tenant_white_label?.[0]
            });
          }
        }
      } catch (err: any) {
        console.error('Error resolving tenant:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    resolveStore();
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, store, isLoading, error, hasFeature }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);
