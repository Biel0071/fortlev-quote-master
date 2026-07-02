import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function VersionCenter() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("system_versions").select("*").order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => setRows(data ?? []));
  }, []);
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Version Center</h2>
        <p className="text-sm text-muted-foreground">Todas as versões registradas pela pipeline.</p>
      </div>
      <Card className="divide-y">
        {rows.length === 0 && <div className="p-6 text-sm text-muted-foreground">Nenhuma versão ainda.</div>}
        {rows.map(v => (
          <div key={v.id} className="p-4">
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold">{v.version}</span>
              <Badge variant="outline">{v.environment}</Badge>
              <Badge variant="outline">{v.status}</Badge>
              {v.is_stable && <Badge variant="secondary">estável</Badge>}
              {v.is_current && <Badge>atual</Badge>}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {v.branch} · {v.commit_hash?.slice(0,7)} · {v.commit_author} · {new Date(v.created_at).toLocaleString()}
            </div>
            {v.release_notes && <p className="text-sm mt-2 whitespace-pre-wrap">{v.release_notes}</p>}
          </div>
        ))}
      </Card>
    </div>
  );
}
