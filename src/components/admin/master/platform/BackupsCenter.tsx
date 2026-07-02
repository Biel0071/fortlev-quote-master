import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database } from "lucide-react";

export default function BackupsCenter() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("platform_backups").select("*").order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => setRows(data ?? []));
  }, []);
  const size = (b: number | null) => b ? `${(b / 1024 / 1024).toFixed(1)} MB` : "—";
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Backups</h2>
        <p className="text-sm text-muted-foreground">Banco, storage, uploads e volumes Docker.</p>
      </div>
      <Card className="divide-y">
        {rows.length === 0 && <div className="p-6 text-sm text-muted-foreground">Nenhum backup registrado.</div>}
        {rows.map(b => (
          <div key={b.id} className="p-4 flex items-center gap-3">
            <Database className="h-4 w-4" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{b.kind}</span>
                <Badge variant={b.status === "success" ? "default" : "outline"}>{b.status}</Badge>
                <span className="text-xs text-muted-foreground">{size(b.size_bytes)}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {b.location ?? "—"} · {new Date(b.created_at).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
