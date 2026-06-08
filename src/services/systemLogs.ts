import { supabase } from "@/integrations/supabase/client";

export const logSystemEvent = async ({
  event_type,
  level = 'info',
  source = 'system',
  message,
  metadata = {}
}: {
  event_type: string;
  level?: 'info' | 'warning' | 'error' | 'critical';
  source?: string;
  message: string;
  metadata?: any;
}) => {
  await supabase.from('system_event_logs').insert({
    event_type,
    level,
    source,
    message,
    metadata
  });
};

