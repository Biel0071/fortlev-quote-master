import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Store {
  id: string;
  name: string;
  slug: string;
  tenant_id: string;
}

interface TenantContextType {
  store: Store | null;
  isLoading: boolean;
  error: string | null;
}

const TenantContext = createContext<TenantContextType>({
  store: null,
  isLoading: true,
  error: null,
});

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function resolveStore() {
      try {
        const hostname = window.location.hostname;
        
        // Check domains table
        const { data: domainData, error: domainError } = await supabase
          .from('store_domains')
          .select('store_id')
          .eq('domain', hostname)
          .maybeSingle();

        let storeId = domainData?.store_id;

        // Fallback to slug if in subdirectory or dev environment
        if (!storeId) {
          const pathParts = window.location.pathname.split('/');
          const possibleSlug = pathParts[1]; // e.g., /loja-do-ze/
          
          if (possibleSlug && possibleSlug !== 'admin' && possibleSlug !== 'auth') {
             const { data: slugData } = await supabase
              .from('stores')
              .select('id')
              .eq('slug', possibleSlug)
              .maybeSingle();
             storeId = slugData?.id;
          }
        }

        // Final fallback: Get the first/default store
        if (!storeId) {
          const { data: defaultStore } = await supabase
            .from('stores')
            .select('id, name, slug, tenant_id')
            .limit(1)
            .single();
          
          if (defaultStore) {
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
    <TenantContext.Provider value={{ store, isLoading, error }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);
