import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Power, Camera, RefreshCcw, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Props { store: any }

const StoreOverridesPanel = ({ store }: Props) => {
  const qc = useQueryClient();
  const [active, setActive] = useState<boolean>(!!store.active);
  const [suspended, setSuspended] = useState<boolean>(!!store.suspended);

  const flip = useMutation({
    mutationFn: async (patch: Record<string, any>) => {
      const { error } = await supabase.from("stores").update(patch).eq("id", store.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["master-store-detail", store.id] });
      qc.invalidateQueries({ queryKey: ["master-stores"] });
      toast.success("Loja atualizada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const snapshot = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("capture_store_snapshot", { p_store_id: store.id });
      if (error) throw error;
      return data;
    },
    onSuccess: () => toast.success("Snapshot gerado com sucesso"),
    onError: (e: any) => toast.error("Erro no snapshot: " + e.message),
  });

  const clearCarts = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("abandoned_checkouts")
        .delete()
        .eq("recovery_status", "open")
        .gte("created_at", "1900-01-01");
      if (error) throw error;
    },
    onSuccess: () => toast.success("Carrinhos abandonados limpos"),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Power size={18} /> Status Operacional</CardTitle>
          <CardDescription>Controles diretos do Master sobre a loja.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label className="font-medium">Loja Ativa</Label>
              <p className="text-xs text-muted-foreground">Visível publicamente para clientes</p>
            </div>
            <Switch
              checked={active}
              onCheckedChange={(v) => { setActive(v); flip.mutate({ active: v }); }}
            />
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label className="font-medium">Suspender (Block Master)</Label>
              <p className="text-xs text-muted-foreground">Bloqueia operações do admin da loja</p>
            </div>
            <Switch
              checked={suspended}
              onCheckedChange={(v) => { setSuspended(v); flip.mutate({ suspended: v }); }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Camera size={18} /> Snapshot & Restore</CardTitle>
          <CardDescription>Captura estado completo da loja (categorias, banners, tema, módulos).</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => snapshot.mutate()} disabled={snapshot.isPending} className="gap-2">
            <Camera size={14} /> {snapshot.isPending ? "Gerando…" : "Capturar Snapshot Agora"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle size={18} /> Zona de Perigo</CardTitle>
          <CardDescription>Ações destrutivas — confirme antes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            className="gap-2 w-full justify-start"
            onClick={() => {
              if (confirm("Limpar todos os carrinhos abandonados em aberto?")) clearCarts.mutate();
            }}
            disabled={clearCarts.isPending}
          >
            <Trash2 size={14} /> Limpar Carrinhos Abandonados
          </Button>
          <Button
            variant="outline"
            className="gap-2 w-full justify-start"
            onClick={() => { qc.invalidateQueries(); toast.success("Cache invalidado"); }}
          >
            <RefreshCcw size={14} /> Invalidar Cache de Queries
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default StoreOverridesPanel;
