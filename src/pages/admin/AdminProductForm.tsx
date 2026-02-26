import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
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
import { generateStandardProductDescription } from "@/utils/productDescription";

type ImageRow = { id: string; path: string; sort_order: number };

type PreviewRow = {
  id: string;
  product_id: string;
  version: number;
  generated_description: string | null;
  generated_comments_json: Array<{ author_name: string; rating: number; comment_text: string }>;
  generated_images_json: Array<{ path: string; sort_order: number; public_url?: string }>;
  approved: boolean;
  created_at: string;
};

type ProductStatus = "draft" | "published";

async function uploadToBucket(bucket: string, file: File) {
  const ext = file.name.split(".").pop() || "bin";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${Date.now()}-${crypto.randomUUID()}-${safeName}.${ext}`;
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
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [images, setImages] = useState<ImageRow[]>([]);
  const [status, setStatus] = useState<ProductStatus>("draft");

  const [previews, setPreviews] = useState<PreviewRow[]>([]);
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [bulkRegenerating, setBulkRegenerating] = useState(false);

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

  const hasAutoGenerateFlag = Boolean((location.state as any)?.autoGenerate);
  const autoGenConsumedRef = useRef(false);

  const categoryName = useMemo(() => {
    if (!categoryId) return "";
    return categories.find((c) => c.id === categoryId)?.name ?? "";
  }, [categories, categoryId]);

  const buildStandardDescription = (opts?: { id?: string | null; name?: string; categoryName?: string; sku?: string; unit?: string }) => {
    return generateStandardProductDescription({
      id: opts?.id ?? editingId,
      name: (opts?.name ?? name).trim(),
      categoryName: (opts?.categoryName ?? categoryName) || "",
      sku: (opts?.sku ?? sku).trim() || null,
      unit: (opts?.unit ?? unit).trim() || null,
    });
  };

  const regenerateStandardDescription = async () => {
    const md = buildStandardDescription();
    setDescription(md);

    if (!editingId) {
      toast({ title: "Gerado", description: "Descrição padrão aplicada (salve para persistir)." });
      return;
    }

    const { error } = await cloud.from("store_products").update({ description: md }).eq("id", editingId);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Atualizado", description: "Descrição padrão regenerada." });
    await load();
  };

  const regenerateAllProductsStandardDescription = async () => {
    if (bulkRegenerating) return;
    const ok = window.confirm(
      "Isso irá substituir a descrição (description) de TODOS os produtos pelo padrão. Deseja continuar?",
    );
    if (!ok) return;

    setBulkRegenerating(true);
    try {
      const { data, error } = await cloud
        .from("store_products")
        .select("id, name, category_id, category, unit, sku")
        .order("created_at", { ascending: true })
        .limit(1000);
      if (error) throw error;

      const list = (data ?? []) as any[];
      if (list.length === 0) {
        toast({ title: "Nada a fazer", description: "Nenhum produto encontrado." });
        return;
      }

      // map category_id -> name (prefers relational name if available)
      const catById = new Map<string, string>();
      for (const c of categories) catById.set(c.id, c.name);

      // update with small concurrency
      const chunkSize = 20;
      for (let i = 0; i < list.length; i += chunkSize) {
        const chunk = list.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (p) => {
            const catName = (p.category_id && catById.get(p.category_id)) || p.category || "";
            const md = buildStandardDescription({
              id: p.id,
              name: p.name,
              categoryName: catName,
              sku: p.sku ?? "",
              unit: p.unit ?? "",
            });
            const { error: upErr } = await cloud.from("store_products").update({ description: md }).eq("id", p.id);
            if (upErr) throw upErr;
          }),
        );
      }

      toast({ title: "Concluído", description: `Descrições regeneradas: ${list.length}` });
      await load();
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? "Falha ao regenerar descrições", variant: "destructive" });
    } finally {
      setBulkRegenerating(false);
    }
  };

  const load = async () => {
    setLoading(true);

    const [catRes, prodRes, imgRes, previewRes] = await Promise.all([
      cloud
        .from("store_categories")
        .select("id, name, slug, description, sort_order, featured, active")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      editingId
        ? cloud
            .from("store_products")
            .select(
              "id, name, description, category_id, price, promo_price, unit, sku, stock, min_stock, featured, best_seller, active, status",
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
      editingId
        ? cloud
            .from("product_ai_previews")
            .select(
              "id, product_id, version, generated_description, generated_comments_json, generated_images_json, approved, created_at",
            )
            .eq("product_id", editingId)
            .order("created_at", { ascending: false })
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
      setStatus((p.status ?? "draft") as ProductStatus);
    }

    setImages(((imgRes as any).data ?? []) as any);

    const pv = (((previewRes as any).data ?? []) as any[]).map((r) => ({
      ...r,
      generated_comments_json: Array.isArray(r.generated_comments_json) ? r.generated_comments_json : [],
      generated_images_json: Array.isArray(r.generated_images_json) ? r.generated_images_json : [],
    })) as PreviewRow[];

    setPreviews(pv);
    setSelectedPreviewId((prev) => prev ?? (pv[0]?.id ?? null));

    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  const saveProduct = async () => {
    const shouldAutoFillDescription = !description.trim();

    const finalDescription = shouldAutoFillDescription ? buildStandardDescription() : description.trim();
    if (shouldAutoFillDescription) setDescription(finalDescription);

    const payload = {
      name: name.trim(),
      description: finalDescription.trim() || null,
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
    toast({ title: "Criado", description: "Produto criado (rascunho)" });
    nav(`/admin/produtos/editar/${data.id}`, { replace: true, state: { autoGenerate: true } });
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

  const selectedPreview = useMemo(
    () => previews.find((p) => p.id === selectedPreviewId) ?? previews[0] ?? null,
    [previews, selectedPreviewId],
  );

  const generatePreview = async () => {
    if (!editingId) return;
    setGenerating(true);
    try {
      const { data, error } = await cloud.functions.invoke("generate-product-preview", {
        body: { productId: editingId },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "Falha ao gerar preview");

      toast({ title: "Preview gerado", description: "Conteúdo gerado por IA pronto para revisão." });
      await load();
    } catch (e: any) {
      const msg = e?.message ?? "Falha ao gerar preview";
      const friendly = msg.includes("429") ? "IA ocupada no momento. Tente novamente em instantes." : msg;
      toast({ title: "Erro", description: friendly, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const publishSelectedPreview = async () => {
    if (!editingId || !selectedPreview) return;
    setPublishing(true);
    try {
      const { data, error } = await cloud.functions.invoke("publish-product-preview", {
        body: { previewId: selectedPreview.id, overwriteImages: true },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "Falha ao publicar");

      toast({ title: "Publicado", description: "Produto publicado no catálogo oficial." });
      await load();
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? "Falha ao publicar", variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  // Auto-generate right after creating the product (one-shot)
  useEffect(() => {
    if (!editingId) return;
    if (status !== "draft") return;
    if (!hasAutoGenerateFlag) return;
    if (autoGenConsumedRef.current) return;

    // Only auto-generate if there is no preview yet
    if (previews.length > 0) return;

    autoGenConsumedRef.current = true;
    generatePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId, status, previews.length, hasAutoGenerateFlag]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">
            Cadastro completo do produto{status === "draft" ? " (rascunho)" : ""}.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => nav("/admin/produtos")}>Voltar</Button>
          <Button type="button" variant="outline" onClick={regenerateAllProductsStandardDescription} disabled={bulkRegenerating}>
            {bulkRegenerating ? "Regenerando..." : "Regerar descrições (todos)"}
          </Button>
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
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Label>Descrição</Label>
                  <Button type="button" variant="outline" size="sm" onClick={regenerateStandardDescription}>
                    Regerar descrição padrão
                  </Button>
                </div>
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
                      {categories
                        .filter((c) => c.active)
                        .map((c) => (
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
                      <div className="text-sm text-muted-foreground">Aparece na loja (quando publicado).</div>
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
                  <Input
                    type="number"
                    step="0.01"
                    value={promoPrice}
                    onChange={(e) => setPromoPrice(Number(e.target.value) || 0)}
                  />
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

              {editingId && status === "draft" && (
                <div className="rounded-2xl border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <div className="font-semibold">Preview IA (rascunho)</div>
                      <div className="text-sm text-muted-foreground">
                        Gere e revise antes de publicar. Previews são versionados.
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={generatePreview} disabled={generating}>
                        {generating ? "Gerando..." : "Regenerar"}
                      </Button>
                      <Button onClick={publishSelectedPreview} disabled={publishing || !selectedPreview}>
                        {publishing ? "Publicando..." : "Aprovar e Publicar"}
                      </Button>
                    </div>
                  </div>

                  {previews.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      Nenhum preview ainda{generating ? "." : ". Clique em Regenerar para gerar."}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Label className="text-xs">Versões</Label>
                        <Select value={selectedPreviewId ?? ""} onValueChange={(v) => setSelectedPreviewId(v || null)}>
                          <SelectTrigger className="w-[240px]">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            {previews.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                v{p.version} · {new Date(p.created_at).toLocaleString()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedPreview && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Descrição gerada</Label>
                            <div className="text-sm whitespace-pre-wrap rounded-xl border border-border p-3 bg-card/60">
                              {selectedPreview.generated_description || "(sem descrição)"}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Comentários gerados</Label>
                            <div className="space-y-2">
                              {(selectedPreview.generated_comments_json ?? []).slice(0, 10).map((c, idx) => (
                                <div key={idx} className="rounded-xl border border-border p-3 bg-card/60">
                                  <div className="text-sm font-medium">{c.author_name} · {c.rating}/5</div>
                                  <div className="text-sm text-muted-foreground mt-1">{c.comment_text}</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Imagens geradas</Label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {(selectedPreview.generated_images_json ?? [])
                                .slice()
                                .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                                .map((im, idx) => (
                                  <img
                                    key={idx}
                                    src={im.public_url || imageUrl(im.path)}
                                    alt={`Imagem gerada v${selectedPreview.version} #${idx + 1}`}
                                    className="w-full aspect-square object-cover rounded-xl border border-border"
                                    loading="lazy"
                                  />
                                ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
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
                                <Button size="sm" variant="outline" onClick={() => moveImage(img, -1)}>
                                  ↑
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => moveImage(img, 1)}>
                                  ↓
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => removeImage(img)}>
                                  Remover
                                </Button>
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
