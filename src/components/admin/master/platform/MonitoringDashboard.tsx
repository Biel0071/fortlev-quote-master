import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Activity, Cpu, HardDrive, Server } from "lucide-react";

export default function MonitoringDashboard() {
  const [stats, setStats] = useState({ servers: 0, containers: 0, alerts: 0, versions: 0 });
  useEffect(() => {
    (async () => {
      const [s, c, a, v] = await Promise.all([
        supabase.from("platform_servers").select("id", { count: "exact", head: true }),
        supabase.from("platform_containers").select("id", { count: "exact", head: true }),
        supabase.from("platform_alerts").select("id", { count: "exact", head: true }).eq("resolved", false),
        supabase.from("system_versions").select("id", { count: "exact", head: true }),
      ]);
      setStats({ servers: s.count ?? 0, containers: c.count ?? 0, alerts: a.count ?? 0, versions: v.count ?? 0 });
    })();
  }, []);
  const kpis = [
    { label: "Servidores", value: stats.servers, icon: Server },
    { label: "Containers", value: stats.containers, icon: HardDrive },
    { label: "Alertas abertos", value: stats.alerts, icon: Activity },
    { label: "Versões", value: stats.versions, icon: Cpu },
  ];
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Monitoramento</h2>
        <p className="text-sm text-muted-foreground">Visão geral da infraestrutura.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(k => (
          <Card key={k.label} className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs"><k.icon className="h-4 w-4" />{k.label}</div>
            <div className="text-3xl font-bold mt-2">{k.value}</div>
          </Card>
        ))}
      </div>
      <Card className="p-6 text-sm text-muted-foreground">
        Métricas em tempo real (CPU, RAM, disco, Nginx, Docker) são reportadas pelo agente na VPS via edge function
        <code className="mx-1 px-1 rounded bg-muted">platform-heartbeat</code> (a criar na Fase 5).
      </Card>
    </div>
  );
}
