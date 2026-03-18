import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Truck, Calculator, MapPin, Save, Info } from "lucide-react";
import { toast } from "sonner";

export default function AdminShipping() {
  const qc = useQueryClient();

  const { data: rules } = useQuery({
    queryKey: ["shipping-rules"],
    queryFn: async () => {
      const { data } = await supabase.from("shipping_rules").select("*").eq("active", true).limit(1).single();
      return data;
    },
  });

  const { data: zones } = useQuery({
    queryKey: ["shipping-zones"],
    queryFn: async () => {
      const { data } = await supabase.from("shipping_zones").select("*").order("sort_order");
      return data || [];
    },
  });

  const [editRules, setEditRules] = useState<any>(null);
  const [editZones, setEditZones] = useState<any[]>([]);

  const ruleValues = editRules || rules || { min_freight: 30, rate_percent: 7, rate_per_km: 0.5, max_weight_kg: 500, max_distance_km: 400 };
  const zoneValues = editZones.length ? editZones : zones || [];

  const saveRules = useMutation({
    mutationFn: async () => {
      if (!rules?.id) return;
      const { error } = await supabase.from("shipping_rules").update({
        min_freight: ruleValues.min_freight,
        rate_percent: ruleValues.rate_percent,
        rate_per_km: ruleValues.rate_per_km,
        max_weight_kg: ruleValues.max_weight_kg,
        max_distance_km: ruleValues.max_distance_km,
      }).eq("id", rules.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Regras atualizadas"); qc.invalidateQueries({ queryKey: ["shipping-rules"] }); },
    onError: () => toast.error("Erro ao salvar"),
  });

  const saveZone = async (zone: any) => {
    const { error } = await supabase.from("shipping_zones").update({
      base_price: zone.base_price,
      per_km_price: zone.per_km_price,
    }).eq("id", zone.id);
    if (error) { toast.error("Erro ao salvar zona"); return; }
    toast.success(`Zona "${zone.name}" atualizada`);
    qc.invalidateQueries({ queryKey: ["shipping-zones"] });
  };

  const updateRule = (key: string, value: number) => {
    setEditRules({ ...ruleValues, [key]: value });
  };

  const updateZone = (idx: number, key: string, value: number) => {
    const copy = [...zoneValues];
    copy[idx] = { ...copy[idx], [key]: value };
    setEditZones(copy);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Truck className="h-6 w-6 text-primary" /> Frete
        </h1>
        <p className="text-sm text-muted-foreground">Configure regras de frete e zonas de entrega.</p>
      </div>

      {/* Formula display */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-start gap-3">
            <Calculator className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Fórmula atual</p>
              <code className="text-xs bg-background/80 px-2 py-1 rounded mt-1 block">
                Frete = MAX(R${ruleValues.min_freight}, subtotal × {ruleValues.rate_percent}%)
              </code>
              <p className="text-xs text-muted-foreground mt-1">
                Para zonas com distância: base + (distância × taxa/km)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rules config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4" /> Regras gerais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Frete mínimo (R$)</label>
              <Input type="number" value={ruleValues.min_freight} onChange={(e) => updateRule("min_freight", parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Taxa sobre subtotal (%)</label>
              <Input type="number" value={ruleValues.rate_percent} onChange={(e) => updateRule("rate_percent", parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Valor por km (R$)</label>
              <Input type="number" value={ruleValues.rate_per_km} step="0.01" onChange={(e) => updateRule("rate_per_km", parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Peso máximo (kg)</label>
              <Input type="number" value={ruleValues.max_weight_kg} onChange={(e) => updateRule("max_weight_kg", parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Distância máxima (km)</label>
              <Input type="number" value={ruleValues.max_distance_km} onChange={(e) => updateRule("max_distance_km", parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <Button className="mt-4" size="sm" onClick={() => saveRules.mutate()} disabled={saveRules.isPending}>
            <Save className="h-4 w-4 mr-2" /> Salvar regras
          </Button>
        </CardContent>
      </Card>

      {/* Zones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Zonas de entrega
          </CardTitle>
          <CardDescription className="text-xs">Configure o valor base e taxa por km para cada zona.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zona</TableHead>
                  <TableHead>Distância</TableHead>
                  <TableHead>Base (R$)</TableHead>
                  <TableHead>Por km (R$)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zoneValues.map((z: any, i: number) => (
                  <TableRow key={z.id}>
                    <TableCell className="font-medium text-sm">{z.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{z.min_km}–{z.max_km} km</TableCell>
                    <TableCell>
                      <Input type="number" className="w-20 h-8 text-xs" value={z.base_price} onChange={(e) => updateZone(i, "base_price", parseFloat(e.target.value) || 0)} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" className="w-20 h-8 text-xs" step="0.01" value={z.per_km_price} onChange={(e) => updateZone(i, "per_km_price", parseFloat(e.target.value) || 0)} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={z.active ? "default" : "secondary"}>
                        {z.active ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => saveZone(zoneValues[i])}>
                        <Save className="h-3 w-3 mr-1" /> Salvar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
