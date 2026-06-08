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
      setIsLoading(true);
      try {
        const hostname = window.location.hostname;
        const pathname = window.location.pathname;
        const pathParts = pathname.split('/');
        
        let storeId: string | undefined;
        let tenantId: string | undefined;

        // 1. Resolve Store and Tenant by Route Params (Master Impersonation)
        // Check for /admin/store/:storeId
        const adminStoreMatch = pathname.match(/\/admin\/store\/([^\/]+)/);
        if (adminStoreMatch && adminStoreMatch[1]) {
          storeId = adminStoreMatch[1];
        }

        // 2. Resolve by Domain
        if (!storeId) {
          const { data: domainData } = await supabase
            .from('store_domains')
            .select('store_id, tenant_id')
            .eq('domain', hostname)
            .maybeSingle();

          if (domainData) {
            storeId = domainData.store_id;
            tenantId = domainData.tenant_id;
          }
        }

        // 3. Resolve by Slug (/p/:slug)
        if (!storeId) {
          const pMatch = pathname.match(/\/p\/([^\/]+)/);
          const possibleSlug = pMatch ? pMatch[1] : (pathParts[1] && !['admin', 'auth', 'master'].includes(pathParts[1]) ? pathParts[1] : null);
          
          if (possibleSlug) {
            const { data: slugData } = await supabase
              .from('stores')
              .select('id, tenant_id')
              .eq('slug', possibleSlug)
              .maybeSingle();
            
            if (slugData) {
              storeId = slugData.id;
              tenantId = slugData.tenant_id;
            }
          }
        }

        // 4. Default Fallback (Only for root or non-admin/non-master routes)
        if (!storeId && (pathname === '/' || !['admin', 'master', 'auth'].includes(pathParts[1]))) {
          // Priority: 1. MF Atacadista, 2. Most recent active stores
          const { data: fallbackStores } = await supabase
            .from('stores')
            .select('id, name, slug, tenant_id, active')
            .order('created_at', { ascending: false });
          
          if (fallbackStores && fallbackStores.length > 0) {
            const preferred = fallbackStores.find(s => 
              s.name.toLowerCase().includes('mf atacadista')
            );
            const defaultStore = preferred || fallbackStores.find(s => s.active) || fallbackStores[0];
            storeId = defaultStore.id;
            tenantId = defaultStore.tenant_id;
          }
        }

        // 5. Finalize Store Data
        if (storeId) {
          const { data: storeData, error: storeErr } = await supabase
            .from('stores')
            .select('id, name, slug, tenant_id')
            .eq('id', storeId)
            .single();
          
          if (!storeErr && storeData) {
            setStore(storeData);
            tenantId = storeData.tenant_id;
          }
        } else {
          setStore(null);
        }

        // 6. Fetch Tenant Data with Subscription and White Label
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
        } else {
          setTenant(null);
        }
      } catch (err: any) {
        console.error('Error resolving tenant:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    resolveStore();
  }, [window.location.pathname, window.location.hostname]);

  return (
    <TenantContext.Provider value={{ tenant, store, isLoading, error, hasFeature }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);
