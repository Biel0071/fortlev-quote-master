import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { cloud } from "@/lib/cloud";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import type { StoreCategory } from "@/hooks/useStoreCategories";

type ImageRow = { id: string; path: string; sort_order: number };

async function uploadToBucket(bucket: string, file: File) {
  const ext = file.name.split(".").pop() || "bin";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error } = await cloud.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return path;
}

export default function AdminProductForm() {
  const { id } = useParams();
  const editingId = id ?? null;
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [images, setImages] = useState<ImageRow[]>([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [price, setPrice] = useState<number>(0);
  const [promoPrice, setPromoPrice] = useState<number>(0);
  const [unit, setUnit] = useState("un");
  const [sku, setSku] = useState("");
  const [stock, setStock] = useState<number>(0);
  const [minStock, setMinStock] = useState<number>(0);
  const [featured, setFeatured] = useState(false);
  const [bestSeller, setBestSeller] = useState(false);
  const [active, setActive] = useState(true);

  const title = useMemo(() => (editingId ? "Editar produto" : "Novo produto"), [editingId]);

  const load = async () => {
    setLoading(true);

    const [catRes, prodRes, imgRes] = await Promise.all([
      cloud
        .from("store_categories")
        .select("id, name, slug, description, sort_order, featured, active")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      editingId
        ? cloud
            .from("store_products")
            .select(
              "id, name, description, category_id, price, promo_price, unit, sku, stock, min_stock, featured, best_seller, active",
            )
            .eq("id", editingId)
            .maybeSingle()
        : Promise.resolve({ data: null } as any),
      editingId
        ? cloud
            .from("store_product_images")
            .select("id, path, sort_order")
            .eq("product_id", editingId)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [] } as any),
    ]);

    setCategories((catRes.data ?? []) as any);

    if (prodRes?.data) {
      const p: any = prodRes.data;
      setName(p.name ?? "");
      setDescription(p.description ?? "");
      setCategoryId(p.category_id ?? null);
      setPrice(Number(p.price ?? 0));
      setPromoPrice(Number(p.promo_price ?? 0));
      setUnit(p.unit ?? "un");
      setSku(p.sku ?? "");
      setStock(Number(p.stock ?? 0));
      setMinStock(Number(p.min_stock ?? 0));
      setFeatured(Boolean(p.featured));
      setBestSeller(Boolean(p.best_seller));
      setActive(Boolean(p.active));
    }

    setImages(((imgRes as any).data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  const saveProduct = async () => {
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      category_id: categoryId,
      category: null, // legacy text not used anymore
      price: Number(price) || 0,
      promo_price: Number(promoPrice) || 0,
      unit: unit.trim() || null,
      sku: sku.trim() || null,
      stock: Number(stock) || 0,
      min_stock: Number(minStock) || 0,
      featured,
      best_seller: bestSeller,
      active,
    };

    if (!payload.name) return toast({ title: "Atenção", description: "Informe o nome." });

    if (editingId) {
      const { error } = await cloud.from("store_products").update(payload).eq("id", editingId);
      if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
      toast({ title: "Salvo", description: "Produto atualizado" });
      await load();
      return;
    }

    const { data, error } = await cloud.from("store_products").insert(payload).select("id").single();
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Criado", description: "Produto criado" });
    nav(`/admin/produtos/editar/${data.id}`, { replace: true });
  };

  const handleUploadImages = async (files: FileList | null) => {
    if (!editingId || !files || files.length === 0) return;

    try {
      const nextSortBase = images.reduce((acc, it) => Math.max(acc, it.sort_order ?? 0), -1) + 1;
      const uploadedPaths = await Promise.all(Array.from(files).map((f) => uploadToBucket("product-images", f)));

      const inserts = uploadedPaths.map((path, idx) => ({
        product_id: editingId,
        path,
        sort_order: nextSortBase + idx,
      }));

      const { error } = await cloud.from("store_product_images").insert(inserts as any);
      if (error) throw error;

      toast({ title: "Upload concluído", description: "Imagens adicionadas" });
      await load();
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? "Falha ao enviar imagens", variant: "destructive" });
    }
  };

  const moveImage = async (img: ImageRow, dir: -1 | 1) => {
    if (!editingId) return;
    const sorted = [...images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const idx = sorted.findIndex((x) => x.id === img.id);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return;

    const a = sorted[idx];
    const b = sorted[swapIdx];

    const { error } = await cloud
      .from("store_product_images")
      .update([{ id: a.id, sort_order: b.sort_order }, { id: b.id, sort_order: a.sort_order }] as any);

    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    await load();
  };

  const removeImage = async (img: ImageRow) => {
    if (!editingId) return;
    const { error } = await cloud.from("store_product_images").delete().eq("id", img.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    await load();
  };

  const imageUrl = (path: string) => {
    const { data } = cloud.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">Cadastro completo do produto.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => nav("/admin/produtos")}>Voltar</Button>
          <Button onClick={saveProduct}>Salvar</Button>
        </div>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Card className="lg:col-span-3 rounded-2xl">
            <CardHeader>
              <CardTitle>Dados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-32" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={categoryId ?? ""} onValueChange={(v) => setCategoryId(v || null)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {categories.filter((c) => c.active).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="un, sc, m³, kg..." />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>SKU</Label>
                  <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Ex.: CIMENTO-CP2" />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex items-center justify-between rounded-xl border border-border p-4">
                    <div>
                      <div className="font-medium">Ativo</div>
                      <div className="text-sm text-muted-foreground">Aparece na loja.</div>
                    </div>
                    <Switch checked={active} onCheckedChange={setActive} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Preço</Label>
                  <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(Number(e.target.value) || 0)} />
                </div>
                <div className="space-y-2">
                  <Label>Preço promocional</Label>
                  <Input type="number" step="0.01" value={promoPrice} onChange={(e) => setPromoPrice(Number(e.target.value) || 0)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Estoque</Label>
                  <Input type="number" value={stock} onChange={(e) => setStock(Number(e.target.value) || 0)} />
                </div>
                <div className="space-y-2">
                  <Label>Estoque mínimo</Label>
                  <Input type="number" value={minStock} onChange={(e) => setMinStock(Number(e.target.value) || 0)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center justify-between rounded-xl border border-border p-4">
                  <div>
                    <div className="font-medium">Produto destaque</div>
                    <div className="text-sm text-muted-foreground">Aparece em seções de vitrine.</div>
                  </div>
                  <Switch checked={featured} onCheckedChange={setFeatured} />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border p-4">
                  <div>
                    <div className="font-medium">Mais vendido</div>
                    <div className="text-sm text-muted-foreground">Prioriza em listas.</div>
                  </div>
                  <Switch checked={bestSeller} onCheckedChange={setBestSeller} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 rounded-2xl">
            <CardHeader>
              <CardTitle>Imagens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!editingId ? (
                <div className="text-sm text-muted-foreground">Salve o produto primeiro para enviar imagens.</div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Upload (múltiplas)</Label>
                    <Input type="file" multiple accept="image/*" onChange={(e) => handleUploadImages(e.target.files)} />
                  </div>

                  {images.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Nenhuma imagem.</div>
                  ) : (
                    <div className="space-y-3">
                      {images
                        .slice()
                        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                        .map((img) => (
                          <div key={img.id} className="rounded-xl border border-border bg-card/60 backdrop-blur p-3">
                            <img
                              src={imageUrl(img.path)}
                              alt="Imagem do produto"
                              className="w-full h-40 object-cover rounded-lg"
                              loading="lazy"
                            />
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <div className="text-xs text-muted-foreground truncate">ordem: {img.sort_order}</div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => moveImage(img, -1)}>↑</Button>
                                <Button size="sm" variant="outline" onClick={() => moveImage(img, 1)}>↓</Button>
                                <Button size="sm" variant="ghost" onClick={() => removeImage(img)}>Remover</Button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
