import { useEffect, useState } from "react";
import { cloud } from "@/lib/cloud";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus, ArrowUpRight, Link2, Layers } from "lucide-react";

type Product = { id: string; name: string };
type Rec = { id: string; product_id: string; recommended_product_id: string; type: string; score: number };

export default function AdminRecommendations() {
  const [products, setProducts] = useState<Product[]>([]);
  const [recs, setRecs] = useState<Rec[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Form state
  const [recType, setRecType] = useState<string>("cross_sell");
  const [recTarget, setRecTarget] = useState<string>("");

  useEffect(() => {
    Promise.all([
      cloud.from("store_products").select("id, name").eq("active", true).order("name"),
      cloud.from("product_recommendations").select("*").order("created_at", { ascending: false }),
    ]).then(([pRes, rRes]) => {
      if (pRes.data) setProducts(pRes.data as any);
      if (rRes.data) setRecs(rRes.data as any);
      setLoading(false);
    });
  }, []);

  const filtered = recs.filter((r) => !selectedProduct || r.product_id === selectedProduct);

  const handleAdd = async () => {
    if (!selectedProduct || !recTarget || !recType) {
      toast.error("Selecione produto principal, tipo e produto recomendado");
      return;
    }
    if (selectedProduct === recTarget) {
      toast.error("Produto principal e recomendado devem ser diferentes");
      return;
    }

    const { data, error } = await cloud
      .from("product_recommendations")
      .insert({ product_id: selectedProduct, recommended_product_id: recTarget, type: recType, score: 1 } as any)
      .select("*")
      .single();

    if (error) {
      toast.error(error.message.includes("duplicate") ? "Recomendação já existe" : error.message);
      return;
    }

    setRecs((prev) => [data as any, ...prev]);
    setRecTarget("");
    toast.success("Recomendação adicionada");
  };

  const handleDelete = async (id: string) => {
    await cloud.from("product_recommendations").delete().eq("id", id);
    setRecs((prev) => prev.filter((r) => r.id !== id));
    toast.success("Removida");
  };

  const getName = (id: string) => products.find((p) => p.id === id)?.name ?? id.slice(0, 8);

  const typeIcon = (t: string) => {
    if (t === "upsell") return <ArrowUpRight className="h-3.5 w-3.5 text-primary" />;
    if (t === "cross_sell") return <Link2 className="h-3.5 w-3.5 text-orange-500" />;
    return <Layers className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const typeLabel = (t: string) => {
    if (t === "upsell") return "Upsell";
    if (t === "cross_sell") return "Cross-sell";
    return "Relacionado";
  };

  if (loading) return <div className="p-6 text-muted-foreground text-sm">Carregando...</div>;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold">Recomendações de Produtos</h1>
        <p className="text-sm text-muted-foreground">Configure upsell, cross-sell e produtos relacionados</p>
      </div>

      {/* Selector */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Produto Principal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
            <SelectContent className="max-h-64">
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedProduct && (
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={recType} onValueChange={setRecType}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upsell">Upsell</SelectItem>
                  <SelectItem value="cross_sell">Cross-sell</SelectItem>
                  <SelectItem value="related">Relacionado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={recTarget} onValueChange={setRecTarget}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Produto recomendado" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {products.filter((p) => p.id !== selectedProduct).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={handleAdd} className="shrink-0">
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* List */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            Recomendações {selectedProduct ? `(${filtered.length})` : `— Todas (${recs.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {selectedProduct ? "Nenhuma recomendação configurada para este produto. O sistema usará sugestões automáticas." : "Selecione um produto acima."}
            </p>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((r) => (
                <div key={r.id} className="flex items-center gap-3 py-2.5">
                  <div className="shrink-0">{typeIcon(r.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{getName(r.product_id)}</div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      → {getName(r.recommended_product_id)}
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                    {typeLabel(r.type)}
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleDelete(r.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
