import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export default function AlertsCenter() {
  const [rows, setRows] = useState<any[]>([]);
  const load = () => supabase.from("platform_alerts").select("*").order("created_at", { ascending: false }).limit(200)
    .then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, []);
  const resolve = async (id: string) => {
    await supabase.from("platform_alerts").update({ resolved: true, resolved_at: new Date().toISOString() }).eq("id", id);
    load();
  };
  const sev = (s: string) => s === "critical" ? "destructive" : s === "warning" ? "secondary" : "outline";
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Alertas</h2>
        <p className="text-sm text-muted-foreground">Eventos de infraestrutura, deploy, SSL, containers.</p>
      </div>
      <Card className="divide-y">
        {rows.length === 0 && <div className="p-6 text-sm text-muted-foreground">Nenhum alerta.</div>}
        {rows.map(a => (
          <div key={a.id} className="p-4 flex items-start gap-3">
            <AlertTriangle className={`h-4 w-4 mt-1 ${a.resolved ? "text-muted-foreground" : "text-yellow-500"}`} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{a.title}</span>
                <Badge variant={sev(a.severity) as any}>{a.severity}</Badge>
                <Badge variant="outline">{a.source}</Badge>
                {a.resolved && <Badge variant="secondary"><CheckCircle2 className="h-3 w-3 mr-1" />resolvido</Badge>}
              </div>
              {a.message && <p className="text-sm text-muted-foreground mt-1">{a.message}</p>}
              <div className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleString()}</div>
            </div>
            {!a.resolved && <Button size="sm" variant="outline" onClick={() => resolve(a.id)}>Resolver</Button>}
          </div>
        ))}
      </Card>
    </div>
  );
}
