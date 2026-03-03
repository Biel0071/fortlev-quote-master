import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { cloud } from "@/lib/cloud";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useSession } from "@/hooks/useSession";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import type { StoreCategory } from "@/hooks/useStoreCategories";

export default function AdminCategories() {
  const { user, loading: sessionLoading } = useSession();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<StoreCategory[]>([]);

  const [editing, setEditing] = useState<StoreCategory | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [featured, setFeatured] = useState(false);
  const [active, setActive] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await cloud
      .from("store_categories")
      .select("id, name, slug, description, sort_order, featured, active")
      .order("sort_order", { ascending: true })
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
    if (!editing) {
      setName("");
      setSlug("");
      setSortOrder(0);
      setFeatured(false);
      setActive(true);
      return;
    }

    setName(editing.name);
    setSlug(editing.slug);
    setSortOrder(editing.sort_order ?? 0);
    setFeatured(Boolean(editing.featured));
    setActive(Boolean(editing.active));
  }, [editing]);

  const title = useMemo(() => (editing ? `Editar: ${editing.name}` : "Nova categoria"), [editing]);

  const canRender = !sessionLoading && !adminLoading;
  if (!canRender) return <div className="p-6 text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/auth/login" replace />;
  if (!isAdmin) return <div className="p-6 text-destructive">Acesso negado.</div>;

  const save = async () => {
    if (!editing) return;
    const { error } = await cloud
      .from("store_categories")
      .update({ name, slug, sort_order: sortOrder, featured, active })
      .eq("id", editing.id);

    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });

    toast({ title: "Salvo", description: "Categoria atualizada" });
    setEditing(null);
    await load();
  };

  const create = async () => {
    const s = slug.trim();
    const n = name.trim();
    if (!n || !s) return toast({ title: "Atenção", description: "Informe nome e slug." });

    const { error } = await cloud
      .from("store_categories")
      .insert({ name: n, slug: s, sort_order: sortOrder, featured, active });

    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });

    toast({ title: "Criado", description: "Categoria criada" });
    setName("");
    setSlug("");
    setSortOrder(0);
    setFeatured(false);
    setActive(true);
    await load();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="font-semibold">Admin • Categorias</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => nav("/admin")}>Produtos</Button>
            <Button variant="outline" onClick={() => nav("/admin/pedidos")}>Pedidos</Button>
            <Button variant="outline" onClick={() => nav("/admin/paginas")}>Páginas</Button>
            <Button variant="outline" onClick={() => nav("/")}>Ver loja</Button>
            <Button
              variant="ghost"
              onClick={async () => {
                await cloud.auth.signOut();
                nav("/");
              }}
            >
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Categorias</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-muted-foreground">Carregando...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {rows.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setEditing(c)}
                    className="text-left rounded-xl border border-border bg-card p-4 hover:bg-muted/30 transition"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium line-clamp-1">{c.name}</div>
                      <div className="text-xs text-muted-foreground">/{c.slug}</div>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground flex items-center justify-between">
                      <span>Ordem: {c.sort_order}</span>
                      <span>{c.active ? "Ativa" : "Inativa"}{c.featured ? " • Destaque" : ""}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Hidráulica" />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="ex.: hidraulica" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Ordem</Label>
                <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value) || 0)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center justify-between rounded-xl border border-border p-4">
                <div>
                  <div className="font-medium">Destaque</div>
                  <div className="text-sm text-muted-foreground">Aparece na home como categoria em destaque.</div>
                </div>
                <Switch checked={featured} onCheckedChange={setFeatured} />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border p-4">
                <div>
                  <div className="font-medium">Ativa</div>
                  <div className="text-sm text-muted-foreground">Categorias inativas não aparecem na loja.</div>
                </div>
                <Switch checked={active} onCheckedChange={setActive} />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              {editing ? (
                <>
                  <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
                  <Button onClick={save}>Salvar</Button>
                </>
              ) : (
                <Button onClick={create}>Criar</Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
