import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cloud } from "@/lib/cloud";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Cat = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  featured: boolean;
  active: boolean;
};

export default function AdminCategoriesList() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Cat[]>([]);

  const load = async () => {
    setLoading(true);
    const { data } = await cloud
      .from("store_categories")
      .select("id, name, slug, description, sort_order, featured, active")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    setRows((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categorias</h1>
          <p className="text-sm text-muted-foreground">Destaques e organização da Home/Catálogo.</p>
        </div>
        <Button onClick={() => nav("/admin/categorias/nova")}>Nova categoria</Button>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Lista</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground">Carregando...</div>
          ) : rows.length === 0 ? (
            <div className="text-muted-foreground">Nenhuma categoria.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {rows.map((c) => (
                <Link
                  key={c.id}
                  to={`/admin/categorias/editar/${c.id}`}
                  className="text-left rounded-xl border border-border bg-card/60 backdrop-blur p-4 hover:bg-muted/30 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium line-clamp-1">{c.name}</div>
                    <Badge variant={c.active ? "default" : "secondary"}>{c.active ? "Ativa" : "Inativa"}</Badge>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground flex items-center justify-between">
                    <span className="text-xs">/{c.slug}</span>
                    <span className="text-xs">Ordem: {c.sort_order}</span>
                  </div>
                  {c.featured && <div className="mt-2 text-xs"><Badge variant="outline">Destaque</Badge></div>}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
