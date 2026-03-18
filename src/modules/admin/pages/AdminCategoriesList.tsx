import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cloud } from "@/lib/cloud";
import { publicImageUrl } from "@/utils/storage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import {
  Copy, FolderOpen, GripVertical, MoreHorizontal, Pencil, Plus, Power,
  Search, Star, Trash2,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Cat = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  featured: boolean;
  active: boolean;
  image_path: string | null;
  product_count?: number;
};
export default function AdminCategoriesList() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Cat[]>([]);
  const [q, setQ] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Cat | null>(null);

  const load = async () => {
    setLoading(true);
    const [catRes, countRes] = await Promise.all([
      cloud
        .from("store_categories")
        .select("id, name, slug, description, sort_order, featured, active, image_path")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      cloud
        .from("store_products")
        .select("id, category_id")
        .eq("active", true),
    ]);

    const cats = (catRes.data ?? []) as Cat[];
    const products = (countRes.data ?? []) as Array<{ id: string; category_id: string | null }>;

    const countMap = new Map<string, number>();
    for (const p of products) {
      if (p.category_id) {
        countMap.set(p.category_id, (countMap.get(p.category_id) ?? 0) + 1);
      }
    }

    setRows(cats.map(c => ({ ...c, product_count: countMap.get(c.id) ?? 0 })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(c => c.name.toLowerCase().includes(s) || c.slug.toLowerCase().includes(s));
  }, [q, rows]);

  const activeCount = rows.filter(c => c.active).length;
  const featuredCount = rows.filter(c => c.featured).length;

  const toggleActive = async (c: Cat) => {
    const { error } = await cloud.from("store_categories").update({ active: !c.active } as any).eq("id", c.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: c.active ? "Desativada" : "Ativada", description: c.name });
    setRows(prev => prev.map(r => r.id === c.id ? { ...r, active: !r.active } : r));
  };

  const toggleFeatured = async (c: Cat) => {
    const { error } = await cloud.from("store_categories").update({ featured: !c.featured } as any).eq("id", c.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: c.featured ? "Removido dos destaques" : "Adicionado aos destaques", description: c.name });
    setRows(prev => prev.map(r => r.id === c.id ? { ...r, featured: !r.featured } : r));
  };

  const duplicateCategory = async (c: Cat) => {
    const { data: original, error: fetchErr } = await cloud.from("store_categories").select("*").eq("id", c.id).single();
    if (fetchErr || !original) { toast({ title: "Erro", description: fetchErr?.message ?? "Não encontrada", variant: "destructive" }); return; }
    const { id, created_at, updated_at, ...rest } = original as any;
    const newSlug = `${rest.slug}-copia-${Date.now().toString(36).slice(-4)}`;
    const { data: newCat, error: insertErr } = await cloud
      .from("store_categories")
      .insert({ ...rest, name: `${rest.name} (cópia)`, slug: newSlug, active: false } as any)
      .select("id, name, slug, description, sort_order, featured, active, image_path")
      .single();
    if (insertErr) { toast({ title: "Erro ao duplicar", description: insertErr.message, variant: "destructive" }); return; }
    if (newCat) {
      toast({ title: "Duplicada", description: `${(newCat as any).name} criada como inativa.` });
      setRows(prev => [...prev, newCat as any]);
    }
  };

  const deleteCategory = async () => {
    if (!deleteTarget) return;
    const { error } = await cloud.from("store_categories").delete().eq("id", deleteTarget.id);
    if (error) { toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Excluída", description: deleteTarget.name });
    setRows(prev => prev.filter(r => r.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categorias</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Organize departamentos e destaques da loja.
          </p>
        </div>
        <Button onClick={() => nav("/admin/categorias/nova")} className="gap-2">
          <Plus className="h-4 w-4" /> Nova categoria
        </Button>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-1.5">
          <FolderOpen className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">{rows.length}</span> total
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-1.5">
          <Power className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium text-foreground">{activeCount}</span> ativas
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-1.5">
          <Star className="h-3.5 w-3.5 text-accent" />
          <span className="font-medium text-foreground">{featuredCount}</span> destaques
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar categoria..."
          className="pl-9"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>{q ? "Nenhuma categoria encontrada." : "Nenhuma categoria cadastrada."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div
              key={c.id}
              className={`group relative rounded-xl border bg-card/80 backdrop-blur-sm transition-all hover:shadow-md hover:border-primary/20 ${
                !c.active ? "opacity-60" : ""
              }`}
            >
              {/* Top section */}
              <div className="p-4 pb-3">
                <div className="flex items-start justify-between gap-2">
                   <div
                      className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                       onClick={() => window.open(`/loja?categoria=${encodeURIComponent(c.slug)}`, "_blank")}
                       title={`Ver ${c.product_count ?? 0} produtos desta categoria`}
                    >
                      <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-muted/40 overflow-hidden flex items-center justify-center">
                        {c.image_path ? (
                          <img
                            src={publicImageUrl("category-images", c.image_path)}
                            alt={c.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <FolderOpen className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm leading-tight line-clamp-1">{c.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          /{c.slug} · <span className="font-medium text-foreground">{c.product_count ?? 0}</span> {(c.product_count ?? 0) === 1 ? "produto" : "produtos"}
                        </p>
                      </div>
                    </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => nav(`/admin/categorias/editar/${c.id}`)}>
                        <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicateCategory(c)}>
                        <Copy className="h-3.5 w-3.5 mr-2" /> Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleFeatured(c)}>
                        <Star className="h-3.5 w-3.5 mr-2" /> {c.featured ? "Remover destaque" : "Destacar"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleActive(c)}>
                        <Power className="h-3.5 w-3.5 mr-2" /> {c.active ? "Desativar" : "Ativar"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget(c)}>
                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Bottom bar */}
              <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
                <Badge variant={c.active ? "default" : "secondary"} className="text-[10px] px-2 py-0">
                  {c.active ? "Ativa" : "Inativa"}
                </Badge>
                {c.featured && (
                  <Badge variant="outline" className="text-[10px] px-2 py-0 border-accent/50 text-accent-foreground">
                    <Star className="h-2.5 w-2.5 mr-0.5 fill-accent" /> Destaque
                  </Badge>
                )}
                <span className="text-[10px] text-muted-foreground ml-auto">#{c.sort_order}</span>
              </div>

              {/* Quick actions on hover - mobile always visible */}
              <div className="border-t border-border/40 px-3 py-2 flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs flex-1 gap-1"
                  onClick={() => nav(`/admin/categorias/editar/${c.id}`)}
                >
                  <Pencil className="h-3 w-3" /> Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs flex-1 gap-1"
                  onClick={() => duplicateCategory(c)}
                >
                  <Copy className="h-3 w-3" /> Duplicar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(c)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              A categoria <strong>{deleteTarget?.name}</strong> será removida permanentemente. Produtos vinculados não serão excluídos, mas perderão a associação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteCategory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
