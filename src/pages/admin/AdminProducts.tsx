import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { cloud } from "@/lib/cloud";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useSession } from "@/hooks/useSession";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/formatters";
import type { StoreProduct } from "@/types/store";

export default function AdminProducts() {
  const { user, loading: sessionLoading } = useSession();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<StoreProduct[]>([]);

  const [editing, setEditing] = useState<StoreProduct | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);
  const [active, setActive] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await cloud
      .from("store_products")
      .select("id, source_id, name, description, category, unit, price, stock, active")
      .order("name", { ascending: true });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      setRows([]);
    } else {
      setRows((data ?? []) as any);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user && isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin]);

  useEffect(() => {
    if (!editing) return;
    setName(editing.name);
    setDescription(editing.description ?? "");
    setPrice(Number(editing.price ?? 0));
    setStock(Number(editing.stock ?? 0));
    setActive(Boolean(editing.active));
  }, [editing]);

  const save = async () => {
    if (!editing) return;

    const { error } = await cloud
      .from("store_products")
      .update({ name, description: description || null, price, stock, active })
      .eq("id", editing.id);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Salvo", description: "Produto atualizado" });
    setEditing(null);
    await load();
  };

  const canRender = !sessionLoading && !adminLoading;
  if (!canRender) return <div className="p-6 text-muted-foreground">Carregando...</div>;

  if (!user) return <Navigate to="/auth/login" replace />;
  if (!isAdmin) return <div className="p-6 text-destructive">Acesso negado.</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="font-semibold">Admin • Produtos</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => nav("/")}>Ver loja</Button>
            <Button variant="ghost" onClick={async () => { await cloud.auth.signOut(); nav("/"); }}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Catálogo</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-muted-foreground">Carregando...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {rows.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setEditing(p)}
                    className="text-left rounded-xl border border-border bg-card p-4 hover:bg-muted/30 transition"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium line-clamp-1">{p.name}</div>
                      <Badge variant={p.active ? "default" : "secondary"}>{p.active ? "Ativo" : "Inativo"}</Badge>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground flex items-center justify-between">
                      <span>Estoque: {p.stock}</span>
                      <span className="font-semibold text-foreground">{formatCurrency(Number(p.price ?? 0))}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {editing && (
          <Card>
            <CardHeader>
              <CardTitle>Editar produto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Preço</Label>
                  <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(Number(e.target.value) || 0)} />
                </div>
                <div className="space-y-2">
                  <Label>Estoque</Label>
                  <Input type="number" value={stock} onChange={(e) => setStock(Number(e.target.value) || 0)} />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border p-4">
                <div>
                  <div className="font-medium">Ativo</div>
                  <div className="text-sm text-muted-foreground">Produtos inativos não aparecem na loja.</div>
                </div>
                <Switch checked={active} onCheckedChange={setActive} />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
                <Button onClick={save}>Salvar</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
