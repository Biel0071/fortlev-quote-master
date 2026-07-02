import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Box } from "lucide-react";

export default function ContainersView() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("platform_containers").select("*, platform_servers(name)").order("created_at")
      .then(({ data }) => setRows(data ?? []));
  }, []);
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Containers</h2>
        <p className="text-sm text-muted-foreground">Estado dos containers Blue/Green por servidor.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rows.length === 0 && <Card className="p-6 text-sm text-muted-foreground">Sem containers registrados. O agente da VPS deve reportar via API.</Card>}
        {rows.map(c => (
          <Card key={c.id} className="p-4">
            <div className="flex items-center gap-2">
              <Box className="h-4 w-4" />
              <span className="font-semibold">{c.name}</span>
              <Badge variant="outline">{c.slot}</Badge>
              <Badge variant={c.status === "running" ? "default" : "outline"}>{c.status}</Badge>
              {c.health && <Badge variant="secondary">{c.health}</Badge>}
            </div>
            <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
              <div>Imagem: {c.image}</div>
              <div>Servidor: {c.platform_servers?.name ?? "—"}</div>
              <div>CPU {c.cpu_pct ?? 0}% · RAM {c.ram_mb ?? 0}MB · restarts {c.restart_count}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
