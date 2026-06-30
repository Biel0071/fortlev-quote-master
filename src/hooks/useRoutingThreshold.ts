import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_THRESHOLD = 1000;

export function useRoutingThreshold() {
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [gatewayEnabled, setGatewayEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("payment_methods_config")
      .select("method, config_json")
      .in("method", ["routing_threshold", "gateway_enabled"])
      .then(({ data }) => {
        for (const row of data ?? []) {
          const cfg = row.config_json as any;
          if (row.method === "routing_threshold") {
            const val = cfg?.threshold;
            if (typeof val === "number" && val > 0) setThreshold(val);
          }
          if (row.method === "gateway_enabled") {
            setGatewayEnabled(cfg?.enabled === true);
          }
        }
        setLoading(false);
      });
  }, []);

  return { threshold, gatewayEnabled, loading };
}
