import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Rocket, RotateCcw, CheckCircle2, GitCommit } from "lucide-react";
import { toast } from "sonner";

type Version = {
  id: string; version: string; branch: string | null; commit_hash: string | null;
  commit_author: string | null; docker_image: string | null; environment: string;
  status: string; is_stable: boolean; is_current: boolean; health: string | null;
  build_seconds: number | null; deploy_seconds: number | null; created_at: string;
  release_notes: string | null;
};

export default function DeployCenter() {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data, error } = await supabase
      .from("system_versions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) toast.error(error.message);
    else setVersions((data as Version[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const current = versions.find(v => v.is_current);
  const stable = versions.find(v => v.is_stable);
  const previous = versions.find(v => !v.is_current && v.environment === "production");

  const rollback = async (v: Version) => {
    if (!confirm(`Rollback para ${v.version}?`)) return;
    const { error } = await supabase.from("system_versions").update({ is_current: false }).eq("is_current", true);
    if (error) return toast.error(error.message);
    await supabase.from("system_versions").update({ is_current: true, status: "deployed" }).eq("id", v.id);
    toast.success(`Rollback marcado para ${v.version}. Execute deploy.sh na VPS.`);
    load();
  };

  const promote = async (v: Version) => {
    await supabase.from("system_versions").update({ is_stable: false }).eq("is_stable", true);
    await supabase.from("system_versions").update({ is_stable: true }).eq("id", v.id);
    toast.success(`${v.version} marcada como estável`);
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Deploy Center</h2>
        <p className="text-sm text-muted-foreground">Controle de versões, deploy Blue/Green e rollback.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Versão Atual</div>
          <div className="text-2xl font-bold">{current?.version ?? "—"}</div>
          <div className="text-xs text-muted-foreground mt-1">{current?.commit_hash?.slice(0,7) ?? "sem commit"}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Última Estável</div>
          <div className="text-2xl font-bold">{stable?.version ?? "—"}</div>
          <div className="text-xs text-muted-foreground mt-1">{stable?.commit_author ?? ""}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Anterior</div>
          <div className="text-2xl font-bold">{previous?.version ?? "—"}</div>
          <div className="text-xs text-muted-foreground mt-1">Disponível para rollback</div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-semibold">Histórico de Versões</div>
          <Button size="sm" variant="outline" onClick={load}>Atualizar</Button>
        </div>
        <div className="divide-y">
          {loading && <div className="p-6 text-sm text-muted-foreground">Carregando...</div>}
          {!loading && versions.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground">
              Nenhuma versão registrada. O CI/CD grava automaticamente após cada deploy.
            </div>
          )}
          {versions.map(v => (
            <div key={v.id} className="p-4 flex items-center gap-4 hover:bg-muted/30">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold">{v.version}</span>
                  {v.is_current && <Badge variant="default"><Rocket className="h-3 w-3 mr-1" />atual</Badge>}
                  {v.is_stable && <Badge variant="secondary"><CheckCircle2 className="h-3 w-3 mr-1" />estável</Badge>}
                  <Badge variant="outline">{v.environment}</Badge>
                  <Badge variant="outline">{v.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                  <span><GitCommit className="h-3 w-3 inline mr-1" />{v.commit_hash?.slice(0,7) ?? "—"}</span>
                  <span>{v.branch ?? "—"}</span>
                  <span>{v.commit_author ?? "—"}</span>
                  <span>{new Date(v.created_at).toLocaleString()}</span>
                  {v.build_seconds && <span>build {v.build_seconds}s</span>}
                  {v.deploy_seconds && <span>deploy {v.deploy_seconds}s</span>}
                </div>
              </div>
              <div className="flex gap-2">
                {!v.is_stable && <Button size="sm" variant="outline" onClick={() => promote(v)}>Promover</Button>}
                {!v.is_current && <Button size="sm" variant="outline" onClick={() => rollback(v)}><RotateCcw className="h-3 w-3 mr-1" />Rollback</Button>}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
