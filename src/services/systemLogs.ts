import { supabase } from "@/integrations/supabase/client";

export const logSystemEvent = async ({
  event_type,
  severity = 'info',
  store_id,
  tenant_id,
  payload = {},
  description
}: {
  event_type: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  store_id?: string;
  tenant_id?: string;
  payload?: any;
  description?: string;
}) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  await supabase.from('system_event_logs').insert({
    event_type,
    severity,
    actor_id: user?.id,
    store_id,
    tenant_id,
    payload,
    description,
    ip_address: 'unknown',
    user_agent: navigator.userAgent
  });
};
