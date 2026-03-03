import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { cloud } from "@/lib/cloud";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

function slugify(v: string) {
  return v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

async function uploadToBucket(bucket: string, file: File) {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error } = await cloud.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return path;
}

export default function AdminCategoryForm() {
  const { id } = useParams();
  const editingId = id ?? null;
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editingImage, setEditingImage] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [imagePath, setImagePath] = useState<string>("");
  const [featured, setFeatured] = useState(false);
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [active, setActive] = useState(true);

  const title = useMemo(() => (editingId ? "Editar categoria" : "Nova categoria"), [editingId]);

  const imageUrl = useMemo(() => {
    if (!imagePath) return "";
    const { data } = cloud.storage.from("category-images").getPublicUrl(imagePath);
    return data.publicUrl;
  }, [imagePath]);

  const load = async () => {
    setLoading(true);
    if (!editingId) {
      setLoading(false);
      return;
    }

    const { data, error } = await cloud
      .from("store_categories")
      .select("id, name, slug, description, image_path, sort_order, featured, active")
      .eq("id", editingId)
      .maybeSingle();

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const c: any = data;
    if (c) {
      setName(c.name ?? "");
      setSlug(c.slug ?? "");
      setDescription(c.description ?? "");
      setImagePath(c.image_path ?? "");
      setSortOrder(Number(c.sort_order ?? 0));
      setFeatured(Boolean(c.featured));
      setActive(Boolean(c.active));
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  useEffect(() => {
    if (!editingId) {
      setSlug(slugify(name));
    }
  }, [editingId, name]);

  const save = async () => {
    const payload = {
      name: name.trim(),
      slug: slugify(slug),
      description: description.trim() || null,
      image_path: imagePath || null,
      featured,
      sort_order: Number(sortOrder) || 0,
      active,
    };

    if (!payload.name) return toast({ title: "Atenção", description: "Informe o nome." });
    if (!payload.slug) return toast({ title: "Atenção", description: "Slug inválido." });

    if (editingId) {
      const { error } = await cloud.from("store_categories").update(payload).eq("id", editingId);
      if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
      toast({ title: "Salvo", description: "Categoria atualizada" });
      return;
    }

    const { data, error } = await cloud.from("store_categories").insert(payload as any).select("id").single();
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Criado", description: "Categoria criada" });
    nav(`/admin/categorias/editar/${data.id}`, { replace: true });
  };

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    try {
      const path = await uploadToBucket("category-images", file);
      setImagePath(path);
      toast({ title: "Upload concluído", description: "Imagem atualizada" });
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? "Falha ao enviar", variant: "destructive" });
    }
  };

  const handleGenerateAi = async () => {
    if (!editingId) return;
    try {
      setGenerating(true);
      const { data, error } = await cloud.functions.invoke("generate-category-image", {
        body: { categoryId: editingId },
      });

      if (error) throw error;
      if (!data?.image_path) throw new Error("Falha ao gerar imagem");

      setImagePath(String(data.image_path));
      toast({ title: "Imagem gerada", description: "Imagem da categoria atualizada" });
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? "Falha ao gerar imagem", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleEditImageAi = async () => {
    if (!imagePath) return toast({ title: "Atenção", description: "Faça upload de uma imagem primeiro." });
    const prompt = imagePrompt.trim();
    if (!prompt) return toast({ title: "Atenção", description: "Descreva a edição desejada." });

    try {
      setEditingImage(true);
      const { data, error } = await cloud.functions.invoke("edit-store-image", {
        body: {
          bucket: "category-images",
          sourcePath: imagePath,
          prompt,
          targetFolder: "ai/categorias",
        },
      });
      if (error) throw error;
      if (!data?.image_path) throw new Error("Falha ao editar imagem");

      const newPath = String(data.image_path);
      setImagePath(newPath);

      if (editingId) {
        const { error: updErr } = await cloud.from("store_categories").update({ image_path: newPath }).eq("id", editingId);
        if (updErr) throw updErr;
      }

      toast({ title: "Imagem editada", description: "Edição salva no armazenamento em nuvem." });
    } catch (e: any) {
      const msg = e?.message ?? "Falha ao editar imagem";
      const desc = msg.includes("rate_limited")
        ? "Muitas requisições no momento, tente novamente em instantes."
        : msg.includes("payment_required")
          ? "Créditos de IA insuficientes no workspace."
          : msg;
      toast({ title: "Erro", description: desc, variant: "destructive" });
    } finally {
      setEditingImage(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">Campos usados automaticamente na Home e Catálogo.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => nav("/admin/categorias")}>Voltar</Button>
          <Button onClick={save}>Salvar</Button>
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
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Hidráulica" />
              </div>

              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="ex.: hidraulica" />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Ordem de exibição</Label>
                  <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value) || 0)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center justify-between rounded-xl border border-border p-4">
                  <div>
                    <div className="font-medium">Categoria destaque</div>
                    <div className="text-sm text-muted-foreground">Aparece nos atalhos da Home.</div>
                  </div>
                  <Switch checked={featured} onCheckedChange={setFeatured} />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border p-4">
                  <div>
                    <div className="font-medium">Ativa</div>
                    <div className="text-sm text-muted-foreground">Aparece na vitrine.</div>
                  </div>
                  <Switch checked={active} onCheckedChange={setActive} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 rounded-2xl">
            <CardHeader>
              <CardTitle>Imagem</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-2">
                  <Label>Upload</Label>
                  <Input type="file" accept="image/*" onChange={(e) => handleUpload(e.target.files?.[0] ?? null)} />
                </div>

                <div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={!editingId || generating}
                    onClick={handleGenerateAi}
                  >
                    {generating ? "Gerando imagem..." : "Gerar imagem (IA)"}
                  </Button>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Gera uma thumbnail quadrada para a categoria e salva automaticamente.
                  </p>
                </div>

                <div className="space-y-2 rounded-xl border border-border p-3">
                  <Label>Edição por IA da imagem atual</Label>
                  <Textarea
                    rows={3}
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="Ex.: deixar fundo mais claro, aumentar nitidez e reforçar contraste"
                  />
                  <Button type="button" variant="outline" className="w-full" disabled={!imagePath || editingImage} onClick={handleEditImageAi}>
                    {editingImage ? "Editando imagem..." : "Editar e salvar no cloud"}
                  </Button>
                </div>
              </div>

              {imageUrl ? (
                <img src={imageUrl} alt="Imagem da categoria" className="w-full h-48 object-cover rounded-xl" loading="lazy" />
              ) : (
                <div className="text-sm text-muted-foreground">Sem imagem.</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
