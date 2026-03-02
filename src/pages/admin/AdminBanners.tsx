import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { cloud } from "@/lib/cloud";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { BANNER_PRESET_SIZES, BannerLivePreview } from "@/components/admin/BannerLivePreview";

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_path: string | null;
  image_desktop_path: string | null;
  image_mobile_path: string | null;
  link_url: string | null;
  button_label: string | null;
  sort_order: number;
  active: boolean;
};

type BannerForm = {
  title: string;
  subtitle: string;
  image_path: string;
  image_desktop_path: string;
  image_mobile_path: string;
  link_url: string;
  button_label: string;
  sort_order: number;
  active: boolean;
  preview_size_key: string;
};

type BannerImageField = "image_desktop_path" | "image_mobile_path" | "image_path";
type BannerLocalPreview = Record<BannerImageField, string>; 

const DEFAULT_SIZE_KEY = "desktop-standard";

function emptyForm(): BannerForm {
  return {
    title: "",
    subtitle: "",
    image_path: "",
    image_desktop_path: "",
    image_mobile_path: "",
    link_url: "",
    button_label: "",
    sort_order: 0,
    active: true,
    preview_size_key: DEFAULT_SIZE_KEY,
  };
}

function emptyLocalPreview(): BannerLocalPreview {
  return {
    image_desktop_path: "",
    image_mobile_path: "",
    image_path: "",
  };
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

export default function AdminBanners() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Banner[]>([]);
  const [createForm, setCreateForm] = useState<BannerForm>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<BannerForm>(emptyForm());
  const [createImagePrompt, setCreateImagePrompt] = useState("");
  const [editImagePrompt, setEditImagePrompt] = useState("");
  const [editingCreateField, setEditingCreateField] = useState<BannerImageField | null>(null);
  const [editingEditField, setEditingEditField] = useState<BannerImageField | null>(null);
  const [createLocalPreview, setCreateLocalPreview] = useState<BannerLocalPreview>(emptyLocalPreview());
  const [editLocalPreview, setEditLocalPreview] = useState<BannerLocalPreview>(emptyLocalPreview());

  const imageUrl = (path?: string | null) => {
    if (!path) return "";
    return cloud.storage.from("banner-images").getPublicUrl(path).data.publicUrl;
  };

  const updateLocalPreview = useCallback(
    (
      setter: Dispatch<SetStateAction<BannerLocalPreview>>,
      field: BannerImageField,
      localUrl: string,
    ) => {
      setter((prev) => {
        if (prev[field]) URL.revokeObjectURL(prev[field]);
        return { ...prev, [field]: localUrl };
      });
    },
    [],
  );

  const clearLocalPreview = useCallback(
    (setter: Dispatch<SetStateAction<BannerLocalPreview>>, values: BannerLocalPreview) => {
      Object.values(values).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
      setter(emptyLocalPreview());
    },
    [],
  );

  const load = async () => {
    setLoading(true);
    const { data, error } = await cloud
      .from("store_banners")
      .select("id, title, subtitle, image_path, image_desktop_path, image_mobile_path, link_url, button_label, sort_order, active")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    setRows((data ?? []) as Banner[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const createSize = useMemo(
    () => BANNER_PRESET_SIZES.find((s) => s.key === createForm.preview_size_key) ?? BANNER_PRESET_SIZES[0],
    [createForm.preview_size_key],
  );

  const editSize = useMemo(
    () => BANNER_PRESET_SIZES.find((s) => s.key === editForm.preview_size_key) ?? BANNER_PRESET_SIZES[0],
    [editForm.preview_size_key],
  );

  async function handleUpload(
    file: File | null,
    setPath: (path: string) => void,
    setLocalPreview?: (localUrl: string) => void,
  ) {
    if (!file) return;

    try {
      if (setLocalPreview) {
        const localUrl = URL.createObjectURL(file);
        setLocalPreview(localUrl);
      }

      const path = await uploadToBucket("banner-images", file);
      setPath(path);
      toast({ title: "Upload concluído", description: "Imagem pronta" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Falha no upload";
      toast({ title: "Erro", description: message, variant: "destructive" });
    }
  }

  async function requestBannerEdit(sourcePath: string, prompt: string) {
    const { data, error } = await cloud.functions.invoke("edit-store-image", {
      body: {
        bucket: "banner-images",
        sourcePath,
        prompt,
        targetFolder: "ai/banners",
      },
    });

    if (error) throw error;
    if (!data?.image_path) throw new Error("Falha ao editar imagem");
    return String(data.image_path);
  }

  const editCreateImage = async (field: BannerImageField) => {
    const sourcePath = createForm[field];
    const prompt = createImagePrompt.trim();

    if (!sourcePath) return toast({ title: "Atenção", description: "Faça upload da imagem antes de editar." });
    if (!prompt) return toast({ title: "Atenção", description: "Descreva a edição desejada." });

    try {
      setEditingCreateField(field);
      const newPath = await requestBannerEdit(sourcePath, prompt);
      setCreateForm((p) => ({ ...p, [field]: newPath }));
      toast({ title: "Imagem editada", description: "Nova versão salva no armazenamento em nuvem." });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Falha ao editar imagem";
      const description = msg.includes("rate_limited")
        ? "Muitas requisições no momento, tente novamente em instantes."
        : msg.includes("payment_required")
          ? "Créditos de IA insuficientes no workspace."
          : msg;
      toast({ title: "Erro", description, variant: "destructive" });
    } finally {
      setEditingCreateField(null);
    }
  };

  const editSavedBannerImage = async (field: BannerImageField) => {
    if (!editingId) return;
    const sourcePath = editForm[field];
    const prompt = editImagePrompt.trim();

    if (!sourcePath) return toast({ title: "Atenção", description: "Faça upload da imagem antes de editar." });
    if (!prompt) return toast({ title: "Atenção", description: "Descreva a edição desejada." });

    try {
      setEditingEditField(field);
      const newPath = await requestBannerEdit(sourcePath, prompt);

      setEditForm((p) => ({ ...p, [field]: newPath }));
      const { error } = await cloud.from("store_banners").update({ [field]: newPath }).eq("id", editingId);
      if (error) throw error;

      await load();
      toast({ title: "Imagem editada", description: "Banner atualizado e salvo no armazenamento em nuvem." });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Falha ao editar imagem";
      const description = msg.includes("rate_limited")
        ? "Muitas requisições no momento, tente novamente em instantes."
        : msg.includes("payment_required")
          ? "Créditos de IA insuficientes no workspace."
          : msg;
      toast({ title: "Erro", description, variant: "destructive" });
    } finally {
      setEditingEditField(null);
    }
  };

  const create = async () => {
    const t = createForm.title.trim();
    if (!t) return toast({ title: "Atenção", description: "Informe o título." });

    const { error } = await cloud.from("store_banners").insert({
      title: t,
      subtitle: createForm.subtitle.trim() || null,
      image_path: createForm.image_path || null,
      image_desktop_path: createForm.image_desktop_path || null,
      image_mobile_path: createForm.image_mobile_path || null,
      link_url: createForm.link_url.trim() || null,
      button_label: createForm.button_label.trim() || null,
      sort_order: Number(createForm.sort_order) || 0,
      active: createForm.active,
    } as any);

    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });

    toast({ title: "Criado", description: "Banner adicionado" });
    clearLocalPreview(setCreateLocalPreview, createLocalPreview);
    setCreateForm(emptyForm());
    await load();
  };

  const startEdit = (b: Banner) => {
    clearLocalPreview(setEditLocalPreview, editLocalPreview);
    setEditingId(b.id);
    setEditForm({
      title: b.title,
      subtitle: b.subtitle ?? "",
      image_path: b.image_path ?? "",
      image_desktop_path: b.image_desktop_path ?? "",
      image_mobile_path: b.image_mobile_path ?? "",
      link_url: b.link_url ?? "",
      button_label: b.button_label ?? "",
      sort_order: b.sort_order,
      active: b.active,
      preview_size_key: DEFAULT_SIZE_KEY,
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const t = editForm.title.trim();
    if (!t) return toast({ title: "Atenção", description: "Informe o título." });

    const { error } = await cloud
      .from("store_banners")
      .update({
        title: t,
        subtitle: editForm.subtitle.trim() || null,
        image_path: editForm.image_path || null,
        image_desktop_path: editForm.image_desktop_path || null,
        image_mobile_path: editForm.image_mobile_path || null,
        link_url: editForm.link_url.trim() || null,
        button_label: editForm.button_label.trim() || null,
        sort_order: Number(editForm.sort_order) || 0,
        active: editForm.active,
      })
      .eq("id", editingId);

    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });

    toast({ title: "Atualizado", description: "Banner editado com sucesso" });
    clearLocalPreview(setEditLocalPreview, editLocalPreview);
    setEditingId(null);
    await load();
  };

  const remove = async (id: string) => {
    const { error } = await cloud.from("store_banners").delete().eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    await load();
  };

  const toggleActive = async (b: Banner) => {
    const { error } = await cloud.from("store_banners").update({ active: !b.active }).eq("id", b.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    await load();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Banners</h1>
        <p className="text-sm text-muted-foreground">Crie, edite e visualize o banner da Home em diferentes tamanhos.</p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Novo banner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={createForm.title} onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Texto do botão</Label>
              <Input
                value={createForm.button_label}
                onChange={(e) => setCreateForm((p) => ({ ...p, button_label: e.target.value }))}
                placeholder="Ver ofertas"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Subtítulo</Label>
            <Textarea value={createForm.subtitle} onChange={(e) => setCreateForm((p) => ({ ...p, subtitle: e.target.value }))} rows={3} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Link</Label>
              <Input
                value={createForm.link_url}
                onChange={(e) => setCreateForm((p) => ({ ...p, link_url: e.target.value }))}
                placeholder="/loja?categoria=hidraulica"
              />
            </div>
            <div className="space-y-2">
              <Label>Ordem</Label>
              <Input
                type="number"
                value={createForm.sort_order}
                onChange={(e) => setCreateForm((p) => ({ ...p, sort_order: Number(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tamanho de preview</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={createForm.preview_size_key}
                onChange={(e) => setCreateForm((p) => ({ ...p, preview_size_key: e.target.value }))}
              >
                {BANNER_PRESET_SIZES.map((size) => (
                  <option key={size.key} value={size.key}>
                    {size.label} ({size.width}x{size.height}px)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border p-4">
              <div>
                <div className="font-medium">Ativo</div>
                <div className="text-sm text-muted-foreground">Aparece na Home.</div>
              </div>
              <Switch checked={createForm.active} onCheckedChange={(checked) => setCreateForm((p) => ({ ...p, active: checked }))} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Imagem (Desktop)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleUpload(
                      e.target.files?.[0] ?? null,
                      (path) => setCreateForm((p) => ({ ...p, image_desktop_path: path })),
                      (localUrl) => updateLocalPreview(setCreateLocalPreview, "image_desktop_path", localUrl),
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Imagem (Mobile)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleUpload(
                      e.target.files?.[0] ?? null,
                      (path) => setCreateForm((p) => ({ ...p, image_mobile_path: path })),
                      (localUrl) => updateLocalPreview(setCreateLocalPreview, "image_mobile_path", localUrl),
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Imagem (Legado - opcional)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleUpload(
                      e.target.files?.[0] ?? null,
                      (path) => setCreateForm((p) => ({ ...p, image_path: path })),
                      (localUrl) => updateLocalPreview(setCreateLocalPreview, "image_path", localUrl),
                    )
                  }
                />
              </div>

              <div className="space-y-2 rounded-xl border border-border p-3">
                <Label>Edição por IA das imagens</Label>
                <Textarea
                  rows={3}
                  value={createImagePrompt}
                  onChange={(e) => setCreateImagePrompt(e.target.value)}
                  placeholder="Ex.: aumentar contraste, remover ruído e destacar produto"
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Button type="button" variant="outline" disabled={!createForm.image_desktop_path || editingCreateField === "image_desktop_path"} onClick={() => editCreateImage("image_desktop_path")}>
                    {editingCreateField === "image_desktop_path" ? "Editando..." : "Editar Desktop"}
                  </Button>
                  <Button type="button" variant="outline" disabled={!createForm.image_mobile_path || editingCreateField === "image_mobile_path"} onClick={() => editCreateImage("image_mobile_path")}>
                    {editingCreateField === "image_mobile_path" ? "Editando..." : "Editar Mobile"}
                  </Button>
                  <Button type="button" variant="outline" disabled={!createForm.image_path || editingCreateField === "image_path"} onClick={() => editCreateImage("image_path")}>
                    {editingCreateField === "image_path" ? "Editando..." : "Editar Legado"}
                  </Button>
                </div>
              </div>
            </div>

            <BannerLivePreview
              title={createForm.title}
              subtitle={createForm.subtitle}
              buttonLabel={createForm.button_label}
              linkUrl={createForm.link_url}
              desktopSrc={createLocalPreview.image_desktop_path || imageUrl(createForm.image_desktop_path)}
              mobileSrc={createLocalPreview.image_mobile_path || imageUrl(createForm.image_mobile_path)}
              legacySrc={createLocalPreview.image_path || imageUrl(createForm.image_path)}
              size={createSize}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={create}>Criar</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Ativos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="text-muted-foreground">Carregando...</div>
          ) : rows.length === 0 ? (
            <div className="text-muted-foreground">Nenhum banner.</div>
          ) : (
            rows.map((b) => (
              <div key={b.id} className="rounded-xl border border-border bg-card/60 p-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{b.title}</div>
                    <div className="text-xs text-muted-foreground">Ordem: {b.sort_order}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <Button size="sm" variant="outline" onClick={() => startEdit(b)}>
                      Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleActive(b)}>
                      {b.active ? "Desativar" : "Ativar"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(b.id)}>
                      Remover
                    </Button>
                  </div>
                </div>

                {(b.image_desktop_path || b.image_mobile_path || b.image_path) && (
                  <img
                    src={imageUrl(b.image_desktop_path || b.image_mobile_path || b.image_path)}
                    alt={`Banner ${b.title}`}
                    className="w-full h-40 object-cover rounded-xl"
                    loading="lazy"
                  />
                )}

                {editingId === b.id ? (
                  <div className="rounded-xl border border-border bg-background p-4 space-y-4">
                    <div className="text-sm font-semibold">Editor de banner</div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Título</Label>
                        <Input value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Texto do botão</Label>
                        <Input
                          value={editForm.button_label}
                          onChange={(e) => setEditForm((p) => ({ ...p, button_label: e.target.value }))}
                          placeholder="Ver ofertas"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Subtítulo</Label>
                      <Textarea value={editForm.subtitle} onChange={(e) => setEditForm((p) => ({ ...p, subtitle: e.target.value }))} rows={3} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Link</Label>
                        <Input value={editForm.link_url} onChange={(e) => setEditForm((p) => ({ ...p, link_url: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Ordem</Label>
                        <Input
                          type="number"
                          value={editForm.sort_order}
                          onChange={(e) => setEditForm((p) => ({ ...p, sort_order: Number(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Tamanho de preview (px)</Label>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                          value={editForm.preview_size_key}
                          onChange={(e) => setEditForm((p) => ({ ...p, preview_size_key: e.target.value }))}
                        >
                          {BANNER_PRESET_SIZES.map((size) => (
                            <option key={size.key} value={size.key}>
                              {size.label} ({size.width}x{size.height}px)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-border p-4">
                        <div>
                          <div className="font-medium">Ativo</div>
                          <div className="text-sm text-muted-foreground">Controla exibição na Home.</div>
                        </div>
                        <Switch checked={editForm.active} onCheckedChange={(checked) => setEditForm((p) => ({ ...p, active: checked }))} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label>Trocar imagem (Desktop)</Label>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handleUpload(
                                e.target.files?.[0] ?? null,
                                (path) => setEditForm((p) => ({ ...p, image_desktop_path: path })),
                                (localUrl) => updateLocalPreview(setEditLocalPreview, "image_desktop_path", localUrl),
                              )
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Trocar imagem (Mobile)</Label>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handleUpload(
                                e.target.files?.[0] ?? null,
                                (path) => setEditForm((p) => ({ ...p, image_mobile_path: path })),
                                (localUrl) => updateLocalPreview(setEditLocalPreview, "image_mobile_path", localUrl),
                              )
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Trocar imagem (Legado)</Label>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handleUpload(
                                e.target.files?.[0] ?? null,
                                (path) => setEditForm((p) => ({ ...p, image_path: path })),
                                (localUrl) => updateLocalPreview(setEditLocalPreview, "image_path", localUrl),
                              )
                            }
                          />
                        </div>

                        <div className="space-y-2 rounded-xl border border-border p-3">
                          <Label>Edição por IA das imagens</Label>
                          <Textarea
                            rows={3}
                            value={editImagePrompt}
                            onChange={(e) => setEditImagePrompt(e.target.value)}
                            placeholder="Ex.: limpar fundo, aumentar nitidez e equilibrar cores"
                          />
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <Button type="button" variant="outline" disabled={!editForm.image_desktop_path || editingEditField === "image_desktop_path"} onClick={() => editSavedBannerImage("image_desktop_path")}>
                              {editingEditField === "image_desktop_path" ? "Editando..." : "Editar Desktop"}
                            </Button>
                            <Button type="button" variant="outline" disabled={!editForm.image_mobile_path || editingEditField === "image_mobile_path"} onClick={() => editSavedBannerImage("image_mobile_path")}>
                              {editingEditField === "image_mobile_path" ? "Editando..." : "Editar Mobile"}
                            </Button>
                            <Button type="button" variant="outline" disabled={!editForm.image_path || editingEditField === "image_path"} onClick={() => editSavedBannerImage("image_path")}>
                              {editingEditField === "image_path" ? "Editando..." : "Editar Legado"}
                            </Button>
                          </div>
                        </div>
                      </div>

                      <BannerLivePreview
                        title={editForm.title}
                        subtitle={editForm.subtitle}
                        buttonLabel={editForm.button_label}
                        linkUrl={editForm.link_url}
                        desktopSrc={editLocalPreview.image_desktop_path || imageUrl(editForm.image_desktop_path)}
                        mobileSrc={editLocalPreview.image_mobile_path || imageUrl(editForm.image_mobile_path)}
                        legacySrc={editLocalPreview.image_path || imageUrl(editForm.image_path)}
                        size={editSize}
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" onClick={() => {
                        clearLocalPreview(setEditLocalPreview, editLocalPreview);
                        setEditingId(null);
                      }}>
                        Cancelar
                      </Button>
                      <Button onClick={saveEdit}>Salvar alterações</Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
