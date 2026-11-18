import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FullScreenLoader } from '@/components/shared/FullScreenLoader';
import { isDatabaseStoreId } from '@/utils/storeId';

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

function getHostnameCandidates(hostname: string) {
  const clean = hostname.toLowerCase().replace(/^www\./, '');
  return Array.from(new Set([hostname.toLowerCase(), clean, `www.${clean}`]));
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

const TENANT_CACHE_PREFIX = 'lovable:tenant_scope:v2:';
const TENANT_CACHE_TTL = 10 * 60 * 1000;
const memoryScopeCache = new Map<string, { at: number; store: Store | null; tenant: Tenant | null }>();

function computeTenantScopeKey(hostname: string, pathname: string): string {
  const adminStoreMatch = pathname.match(/\/admin\/store\/([^\/]+)/);
  if (adminStoreMatch?.[1]) return `admin:${adminStoreMatch[1]}`;
  const section = pathname.split('/')[1] ?? '';
  if (['admin', 'auth', 'master'].includes(section)) return 'system';
  const pMatch = pathname.match(/\/p\/([^\/]+)/);
  if (pMatch?.[1]) return `slug:${pMatch[1].toLowerCase()}`;
  return `host:${hostname.toLowerCase().replace(/^www\./, '')}`;
}

function readScopeCache(scopeKey: string): { store: Store | null; tenant: Tenant | null } | null {
  if (scopeKey === 'system') return { store: null, tenant: null };
  const mem = memoryScopeCache.get(scopeKey);
  if (mem && Date.now() - mem.at < TENANT_CACHE_TTL) return { store: mem.store, tenant: mem.tenant };
  try {
    const raw = sessionStorage.getItem(TENANT_CACHE_PREFIX + scopeKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || Date.now() - parsed.at > TENANT_CACHE_TTL) return null;
    memoryScopeCache.set(scopeKey, parsed);
    return { store: parsed.store ?? null, tenant: parsed.tenant ?? null };
  } catch {
    return null;
  }
}

function writeScopeCache(scopeKey: string, store: Store | null, tenant: Tenant | null) {
  if (scopeKey === 'system' || !store) return;
  const entry = { at: Date.now(), store, tenant };
  memoryScopeCache.set(scopeKey, entry);
  try {
    sessionStorage.setItem(TENANT_CACHE_PREFIX + scopeKey, JSON.stringify(entry));
  } catch {
    /* ignore */
  }
}

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const scopeKey = computeTenantScopeKey(
    typeof window !== 'undefined' ? window.location.hostname : 'localhost',
    location.pathname,
  );
  const initialCached = readScopeCache(scopeKey);
  const [tenant, setTenant] = useState<Tenant | null>(() => initialCached?.tenant ?? null);
  const [store, setStore] = useState<Store | null>(() => initialCached?.store ?? null);
  const [isLoading, setIsLoading] = useState<boolean>(() => initialCached === null && scopeKey !== 'system');
  const [error, setError] = useState<string | null>(null);

  const hasFeature = (feature: keyof PlanLimits) => {
    if (!tenant?.subscription?.plan?.limits) return false;
    const limit = tenant.subscription.plan.limits[feature];
    if (typeof limit === 'boolean') return limit;
    return true;
  };

  useEffect(() => {
    let alive = true;

    if (scopeKey === 'system') {
      setIsLoading(false);
      setError(null);
      return;
    }

    const cached = readScopeCache(scopeKey);
    if (cached?.store && isDatabaseStoreId(cached.store.id)) {
      setStore(cached.store);
      if (cached.tenant) setTenant(cached.tenant);
      setError(null);
      setIsLoading(false);
      return;
    }

    async function resolveStore() {
      setIsLoading(true);
      setError(null);
      try {
        const hostname = window.location.hostname;
        const hostnameCandidates = getHostnameCandidates(hostname);
        const pathname = location.pathname;

        const timeoutId = setTimeout(() => {
          if (alive) setIsLoading(false);
        }, 10000);

        const adminStoreMatch = pathname.match(/\/admin\/store\/([^\/]+)/);
        if (adminStoreMatch && !isDatabaseStoreId(adminStoreMatch[1])) {
          clearTimeout(timeoutId);
          setStore(null);
          setTenant(null);
          setError('O identificador da loja não é válido.');
          setIsLoading(false);
          return;
        }

        // Single round-trip query resolving stores + store_domains together
        const { data: allStores, error: storesErr } = await supabase
          .from('stores')
          .select('id, name, slug, tenant_id, active, store_domains(domain, verified, is_primary)');

        clearTimeout(timeoutId);
        if (!alive) return;

        if (storesErr) {
          setStore(null);
          setTenant(null);
          setError(storesErr.code === '42501'
            ? 'Sem permissão para acessar os dados desta loja.'
            : 'Não foi possível carregar os dados da loja no banco.');
          setIsLoading(false);
          return;
        }

        const rows = (allStores ?? []) as Array<any>;
        let matched: any = null;

        if (adminStoreMatch?.[1]) {
          matched = rows.find((r) => r.id === adminStoreMatch[1]);
        }
        if (!matched) {
          const pMatch = pathname.match(/\/p\/([^\/]+)/);
          if (pMatch?.[1]) {
            matched = rows.find((r) => String(r.slug).toLowerCase() === pMatch[1].toLowerCase());
          }
        }
        if (!matched) {
          matched = rows.find((r) =>
            Array.isArray(r.store_domains) &&
            r.store_domains.some((d: any) => d?.verified && d?.domain && hostnameCandidates.includes(String(d.domain).toLowerCase()))
          );
        }
        if (!matched) {
          const activeRows = rows.filter((r) => r.active);
          matched =
            activeRows.find((r) => String(r.slug) === 'materiais' || String(r.name).toLowerCase().includes('materiais')) ??
            activeRows[0] ??
            null;
        }

        if (matched && isDatabaseStoreId(matched.id)) {
          const resolvedStore: Store = {
            id: matched.id,
            name: matched.name,
            slug: matched.slug,
            tenant_id: matched.tenant_id,
          };
          setStore(resolvedStore);
          writeScopeCache(scopeKey, resolvedStore, null);
          setIsLoading(false); // Unblock UI immediately without waiting for tenant plan metadata!

          if (matched.tenant_id) {
            supabase
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
              .eq('id', matched.tenant_id)
              .maybeSingle()
              .then(({ data: tenantData }) => {
                if (!alive || !tenantData) return;
                const sub = (tenantData as any).saas_subscriptions?.[0];
                const resolvedTenant: Tenant = {
                  id: tenantData.id,
                  name: tenantData.name,
                  subscription: sub ? {
                    id: sub.id,
                    status: sub.status,
                    plan: {
                      id: sub.saas_plans.id,
                      name: sub.saas_plans.name,
                      limits: sub.saas_plans.limits as unknown as PlanLimits,
                    },
                  } : undefined,
                  whiteLabel: (tenantData as any).tenant_white_label?.[0],
                };
                setTenant(resolvedTenant);
                writeScopeCache(scopeKey, resolvedStore, resolvedTenant);
              });
          }
        } else {
          setStore(null);
          setTenant(null);
          setError('A loja não foi identificada no banco.');
          setIsLoading(false);
        }
      } catch (err: any) {
        if (!alive) return;
        console.error('Error resolving tenant:', err);
        setError(err.message);
        setStore(null);
        setTenant(null);
        setIsLoading(false);
      }
    }

    resolveStore();

    return () => {
      alive = false;
    };
  }, [scopeKey]);

  return (
    <TenantContext.Provider value={{ tenant, store, isLoading, error, hasFeature }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);
