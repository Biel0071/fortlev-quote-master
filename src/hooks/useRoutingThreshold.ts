import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_THRESHOLD = 980;

export function useRoutingThreshold() {
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("payment_methods_config")
      .select("config_json")
      .eq("method", "routing_threshold")
      .maybeSingle()
      .then(({ data }) => {
        const val = (data?.config_json as any)?.threshold;
        if (typeof val === "number" && val > 0) setThreshold(val);
        setLoading(false);
      });
  }, []);

  return { threshold, loading };
}
