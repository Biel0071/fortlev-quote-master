
import { supabase } from "@/integrations/supabase/client";

export interface StoreUrlInfo {
  id: string;
  slug: string;
  domain?: string;
}

export const storeUrlService = {
  /**
   * Get the best public URL for a store.
   * Priority: Custom domain > Fallback internal route
   */
  getStorePublicUrl(store: StoreUrlInfo, domains?: any[]) {
    const primaryDomain = domains?.find(d => d.is_primary && d.verified);
    
    if (primaryDomain) {
      return `https://${primaryDomain.domain}`;
    }

    // In Lovable Preview/Internal environment, use the /p/:slug route
    const currentHost = window.location.host;
    const protocol = window.location.protocol;
    
    return `${protocol}//${currentHost}/p/${store.slug}`;
  },

  /**
   * Get the admin URL for a store.
   */
  getStoreAdminUrl(storeId: string) {
    return `/admin/store/${storeId}/dashboard`;
  },

  /**
   * Get the Master Admin cockpit URL for a store.
   */
  getStoreMasterCockpitUrl(storeId: string) {
    return `/admin/master/stores/${storeId}`;
  },

  /**
   * Check if a domain is a real external domain or a system fallback
   */
  isRealDomain(domain: string) {
    return !domain.endsWith('.lovable.app') && !domain.endsWith('.plataforma.com');
  },

  /**
   * Check if the app is running in a preview/development environment
   */
  isPreviewEnvironment() {
    return window.location.hostname.includes('lovable.app') || 
           window.location.hostname === 'localhost';
  }
};
