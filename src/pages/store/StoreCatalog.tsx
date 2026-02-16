import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StoreTopbar } from "@/components/store/StoreTopbar";
import { useCart } from "@/hooks/useCart";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { formatCurrency } from "@/utils/formatters";

export default function StoreCatalog() {
  const cart = useCart();
  const { activeProducts, loading, error } = useStoreProducts();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("all");

  const categories = useMemo(() => {
    const set = new Set<string>();
    activeProducts.forEach((p) => p.category && set.add(p.category));
    return ["all", ...Array.from(set).sort()];
  }, [activeProducts]);

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    return activeProducts.filter((p) => {
      if (category !== "all" && (p.category ?? "") !== category) return false;
      if (!search) return true;
      return p.name.toLowerCase().includes(search) || (p.description ?? "").toLowerCase().includes(search);
    });
  }, [activeProducts, q, category]);

  return (
    <div className="min-h-screen bg-background">
      <StoreTopbar cartCount={cart.totalItems} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Catálogo</h1>
            <p className="text-sm text-muted-foreground">Pesquise, filtre e adicione ao carrinho.</p>
          </div>
          <Button asChild variant="outline"><Link to="/carrinho">Ir ao carrinho</Link></Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto..." />
          <Input value={category} onChange={(e) => setCategory(e.target.value)} list="cat-list" placeholder="Categoria (ou 'all')" />
          <datalist id="cat-list">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <div className="md:col-span-3 text-xs text-muted-foreground">
            Dica: para filtrar por categoria, comece a digitar (ex.: <span className="font-medium">hidraulica</span>).
          </div>
        </div>

        {loading ? (
          <div className="text-muted-foreground">Carregando...</div>
        ) : error ? (
          <div className="text-destructive">{error}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base line-clamp-2">{p.name}</CardTitle>
                  {p.category && <Badge variant="secondary" className="w-fit">{p.category}</Badge>}
                </CardHeader>
                <CardContent className="space-y-3">
                  {p.description && <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">{p.unit ?? "un"}</div>
                    <div className="font-semibold">{formatCurrency(p.price)}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => cart.add(p.id, 1)}>Adicionar</Button>
                    <Button asChild variant="outline"><Link to={`/produto/${p.id}`}>Ver</Link></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
