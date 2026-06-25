import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Zap } from "lucide-react";

const StoreModulesMatrix = () => {
  const qc = useQueryClient();

  const { data: stores } = useQuery({
    queryKey: ["matrix-stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, name, slug").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: defs } = useQuery({
    queryKey: ["matrix-defs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("store_module_definitions").select("id, key, name, category").eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: links } = useQuery({
    queryKey: ["matrix-links"],
    queryFn: async () => {
      const { data, error } = await supabase.from("store_modules").select("store_id, module_key, is_enabled");
      if (error) throw error;
      return data;
    },
  });

  const map = useMemo(() => {
    const m = new Map<string, boolean>();
    links?.forEach((l: any) => m.set(`${l.store_id}:${l.module_key}`, l.is_enabled));
    return m;
  }, [links]);

  const toggle = useMutation({
    mutationFn: async ({ storeId, key, enabled }: { storeId: string; key: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("store_modules")
        .upsert({ store_id: storeId, module_key: key, is_enabled: enabled }, { onConflict: "store_id,module_key" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["matrix-links"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const enableAll = useMutation({
    mutationFn: async (key: string) => {
      if (!stores) return;
      const rows = stores.map((s) => ({ store_id: s.id, module_key: key, is_enabled: true }));
      const { error } = await supabase.from("store_modules").upsert(rows, { onConflict: "store_id,module_key" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matrix-links"] });
      toast.success("Módulo ativado em todas as lojas");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Matriz Loja × Módulo</CardTitle>
        <CardDescription>Toggle direto e propagação em massa entre todas as lojas da plataforma.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-card z-10">Módulo</TableHead>
              {stores?.map((s) => (
                <TableHead key={s.id} className="text-center text-xs">{s.name}</TableHead>
              ))}
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {defs?.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="sticky left-0 bg-card z-10">
                  <div className="font-medium">{d.name}</div>
                  <Badge variant="outline" className="text-[9px] mt-1">{d.category}</Badge>
                </TableCell>
                {stores?.map((s) => {
                  const enabled = map.get(`${s.id}:${d.key}`) ?? false;
                  return (
                    <TableCell key={s.id} className="text-center">
                      <Switch
                        checked={enabled}
                        onCheckedChange={(v) => toggle.mutate({ storeId: s.id, key: d.key, enabled: v })}
                      />
                    </TableCell>
                  );
                })}
                <TableCell className="text-center">
                  <Button size="sm" variant="ghost" className="gap-1" onClick={() => enableAll.mutate(d.key)}>
                    <Zap size={12} /> Ativar todas
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default StoreModulesMatrix;
