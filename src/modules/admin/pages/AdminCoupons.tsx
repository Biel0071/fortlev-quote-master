import { useEffect, useState } from "react";
import { cloud } from "@/lib/cloud";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

type Coupon = {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  starts_at: string | null;
  ends_at: string | null;
  min_subtotal: number;
  active: boolean;
  uses_count: number;
  max_uses: number | null;
};

export default function AdminCoupons() {
  const { activeStoreId } = useStore();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Coupon[]>([]);

  const [code, setCode] = useState("");
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState<number>(10);
  const [minSubtotal, setMinSubtotal] = useState<number>(0);
  const [maxUses, setMaxUses] = useState<number>(0);
  const [active, setActive] = useState(true);

  const load = async () => {
    if (!activeStoreId) return;
    setLoading(true);
    const { data, error } = await cloud
      .from("store_coupons")
      .select("id, code, discount_type, discount_value, starts_at, ends_at, min_subtotal, active, uses_count, max_uses")
      .eq("store_id", activeStoreId)
      .order("created_at", { ascending: false });

    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    setRows((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [activeStoreId]);

  const create = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return toast({ title: "Atenção", description: "Informe o código." });

    const { error } = await cloud.from("store_coupons").insert({
      code: c,
      discount_type: type,
      discount_value: Number(value) || 0,
      min_subtotal: Number(minSubtotal) || 0,
      max_uses: maxUses > 0 ? Number(maxUses) : null,
      active,
      store_id: activeStoreId,
    } as any);

    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Criado", description: "Cupom criado" });
    setCode("");
    setType("percent");
    setValue(10);
    setMinSubtotal(0);
    setMaxUses(0);
    setActive(true);
    await load();
  };

  const toggle = async (row: Coupon) => {
    const { error } = await cloud.from("store_coupons").update({ active: !row.active }).eq("id", row.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    await load();
  };

  const remove = async (id: string) => {
    const { error } = await cloud.from("store_coupons").delete().eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    await load();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cupons</h1>
        <p className="text-sm text-muted-foreground">Descontos por código (aplicados no carrinho/checkout).</p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Novo cupom</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="EX: OBRA10" />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="percent">% percentual</SelectItem>
                  <SelectItem value="fixed">R$ fixo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input type="number" step="0.01" value={value} onChange={(e) => setValue(Number(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Subtotal mínimo</Label>
              <Input type="number" step="0.01" value={minSubtotal} onChange={(e) => setMinSubtotal(Number(e.target.value) || 0)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Máx. usos (0 = ilimitado)</Label>
              <Input type="number" value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value) || 0)} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-4">
              <div>
                <div className="font-medium">Ativo</div>
                <div className="text-sm text-muted-foreground">Pode ser aplicado.</div>
              </div>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={create}>Criar</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Lista</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="text-muted-foreground">Carregando...</div>
          ) : rows.length === 0 ? (
            <div className="text-muted-foreground">Nenhum cupom.</div>
          ) : (
            rows.map((c) => (
              <div key={c.id} className="rounded-xl border border-border bg-card/60 backdrop-blur p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{c.code}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.discount_type === "percent" ? `${c.discount_value}%` : `R$ ${Number(c.discount_value).toFixed(2)}`} • usos: {c.uses_count}{c.max_uses ? `/${c.max_uses}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => toggle(c)}>{c.active ? "Desativar" : "Ativar"}</Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(c.id)}>Remover</Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
