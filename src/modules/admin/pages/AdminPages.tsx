import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { cloud } from "@/lib/cloud";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useSession } from "@/hooks/useSession";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import type { StorePage } from "@/hooks/useStorePages";

export default function AdminPages() {
  const { user, loading: sessionLoading } = useSession();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { activeStoreId } = useStore();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<StorePage[]>([]);

  const [editing, setEditing] = useState<StorePage | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [published, setPublished] = useState(true);
  const [sortOrder, setSortOrder] = useState<number>(0);

  const load = async () => {
    if (!activeStoreId) return;
    setLoading(true);
    const { data, error } = await cloud
      .from("store_pages")
      .select("id, slug, title, content_md, published, sort_order")
      .eq("store_id", activeStoreId)
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      setRows([]);
    } else {
      setRows((data ?? []) as any);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user && isAdmin && activeStoreId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin, activeStoreId]);

  useEffect(() => {
    if (!editing) {
      setTitle("");
      setSlug("");
      setContent("");
      setPublished(true);
      setSortOrder(0);
      return;
    }

    setTitle(editing.title);
    setSlug(editing.slug);
    setContent(editing.content_md ?? "");
    setPublished(Boolean(editing.published));
    setSortOrder(editing.sort_order ?? 0);
  }, [editing]);

  const canRender = !sessionLoading && !adminLoading;
  if (!canRender) return <div className="p-6 text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/auth/login" replace />;
  if (!isAdmin) return <div className="p-6 text-destructive">Acesso negado.</div>;

  const save = async () => {
    if (!editing) return;
    const { error } = await cloud
      .from("store_pages")
      .update({ title, slug, content_md: content, published, sort_order: sortOrder })
      .eq("id", editing.id);

    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });

    toast({ title: "Salvo", description: "Página atualizada" });
    setEditing(null);
    await load();
  };

  const create = async () => {
    const s = slug.trim();
    const t = title.trim();
    if (!t || !s) return toast({ title: "Atenção", description: "Informe título e slug." });

    const { error } = await cloud
      .from("store_pages")
      .insert({ title: t, slug: s, content_md: content ?? "", published, sort_order: sortOrder, store_id: activeStoreId });

    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });

    toast({ title: "Criado", description: "Página criada" });
    setTitle("");
    setSlug("");
    setContent("");
    setPublished(true);
    setSortOrder(0);
    await load();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="font-semibold">Admin • Páginas</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => nav("/admin")}>Produtos</Button>
            <Button variant="outline" onClick={() => nav("/admin/categorias")}>Categorias</Button>
            <Button variant="outline" onClick={() => nav("/admin/pedidos")}>Pedidos</Button>
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
            <CardTitle>Páginas institucionais</CardTitle>
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
                      <div className="font-medium line-clamp-1">{p.title}</div>
                      <div className="text-xs text-muted-foreground">/{p.slug}</div>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground flex items-center justify-between">
                      <span>Ordem: {p.sort_order}</span>
                      <span>{p.published ? "Publicada" : "Rascunho"}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{editing ? `Editar: ${editing.title}` : "Nova página"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Política de Privacidade" />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="ex.: politica-de-privacidade" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Ordem</Label>
                <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value) || 0)} />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border p-4">
                <div>
                  <div className="font-medium">Publicada</div>
                  <div className="text-sm text-muted-foreground">Se desativar, não aparece na loja.</div>
                </div>
                <Switch checked={published} onCheckedChange={setPublished} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Conteúdo (texto)</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-48"
                placeholder="Você pode usar linhas e listas com '- '"
              />
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
