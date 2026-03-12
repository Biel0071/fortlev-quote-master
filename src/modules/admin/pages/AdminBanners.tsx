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
import { getBannerImageUrls, MAX_BANNER_IMAGE_SIZE_BYTES, SITE_BANNERS_BUCKET, normalizeBannerObjectPath } from "@/utils/bannerStorage";
import { processBannerImage, BANNER_DESKTOP_DIMS, BANNER_MOBILE_DIMS } from "@/utils/bannerImageProcessor";
import { invalidateSmartCache } from "@/utils/smartCache";

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_path: string | null;
  image_desktop_path: string | null;
  image_mobile_path: string | null;
  link_url: string | null;
  link: string | null;
  button_label: string | null;
  sort_order: number;
  position: number;
  active: boolean;
  is_active: boolean;
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

type BannerMutationPayload = {
  title: string;
  subtitle: string | null;
  image_path: string | null;
  image_desktop_path: string | null;
  image_mobile_path: string | null;
  link_url: string | null;
  link: string | null;
  button_label: string | null;
  sort_order: number;
  position: number;
  active: boolean;
  is_active: boolean;
  updated_at?: string;
};

const DEFAULT_SIZE_KEY = "desktop-standard";
const HOME_CONTENT_CACHE_KEY = "home_content:v1";

function normalizeBannerImagePath(value?: string | null) {
  return normalizeBannerObjectPath(value);
}


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
  const [uploadingCount, setUploadingCount] = useState(0);
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const isUploading = uploadingCount > 0;

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

  const normalizeBannerRow = useCallback((row: Banner): Banner => {
    return {
      ...row,
      image_path: normalizeBannerImagePath(row.image_path) || null,
      image_desktop_path: normalizeBannerImagePath(row.image_desktop_path) || null,
      image_mobile_path: normalizeBannerImagePath(row.image_mobile_path) || null,
      link_url: row.link_url ?? row.link ?? null,
      link: row.link ?? row.link_url ?? null,
      sort_order: Number(row.sort_order ?? row.position ?? 0),
      position: Number(row.position ?? row.sort_order ?? 0),
      active: Boolean(row.active ?? row.is_active ?? true),
      is_active: Boolean(row.is_active ?? row.active ?? true),
    };
  }, []);

  const buildBannerPayload = useCallback((form: BannerForm, includeUpdatedAt = false): BannerMutationPayload => {
    const normalizedLink = form.link_url.trim() || null;
    const normalizedPosition = Number(form.sort_order) || 0;
    const normalizedActive = form.active;

    return {
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      image_path: normalizeBannerImagePath(form.image_path) || null,
      image_desktop_path: normalizeBannerImagePath(form.image_desktop_path) || null,
      image_mobile_path: normalizeBannerImagePath(form.image_mobile_path) || null,
      link_url: normalizedLink,
      link: normalizedLink,
      button_label: form.button_label.trim() || null,
      sort_order: normalizedPosition,
      position: normalizedPosition,
      active: normalizedActive,
      is_active: normalizedActive,
      ...(includeUpdatedAt ? { updated_at: new Date().toISOString() } : {}),
    };
  }, []);

  const verifySavedBanner = useCallback(async (id: string, payload: BannerMutationPayload) => {
    const { data, error } = await cloud
      .from("store_banners")
      .select("id, image_path, image_desktop_path, image_mobile_path, title, subtitle, button_label, link_url, link, sort_order, position, active, is_active")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(`verify_failed:${error.message}`);
    if (!data) throw new Error(`verify_not_found:banner_id=${id}`);

    const saved = normalizeBannerRow(data as Banner);
    const payloadNormalized = {
      ...payload,
      image_path: normalizeBannerImagePath(payload.image_path) || null,
      image_desktop_path: normalizeBannerImagePath(payload.image_desktop_path) || null,
      image_mobile_path: normalizeBannerImagePath(payload.image_mobile_path) || null,
    };

    const mismatch =
      saved.image_path !== payloadNormalized.image_path ||
      saved.image_desktop_path !== payloadNormalized.image_desktop_path ||
      saved.image_mobile_path !== payloadNormalized.image_mobile_path ||
      saved.title !== payloadNormalized.title ||
      (saved.subtitle ?? null) !== (payloadNormalized.subtitle ?? null) ||
      (saved.button_label ?? null) !== (payloadNormalized.button_label ?? null) ||
      (saved.link_url ?? null) !== (payloadNormalized.link_url ?? null) ||
      saved.sort_order !== payloadNormalized.sort_order ||
      saved.active !== payloadNormalized.active;

    if (mismatch) {
      throw new Error("verify_mismatch: dados salvos diferem do payload enviado");
    }
  }, [normalizeBannerRow]);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await cloud
        .from("store_banners")
        .select("id, title, subtitle, image_path, image_desktop_path, image_mobile_path, link_url, link, button_label, sort_order, position, active, is_active")
        .order("position", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRows(((data ?? []) as Banner[]).map(normalizeBannerRow));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Falha ao carregar banners";
      console.error("[AdminBanners.load]", { error });
      setRows([]);
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
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
    targetDims?: { width: number; height: number },
  ) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Envie apenas imagens (JPG, PNG, WEBP...).", variant: "destructive" });
      return;
    }

    if (file.size > MAX_BANNER_IMAGE_SIZE_BYTES) {
      toast({ title: "Arquivo muito grande", description: "O banner deve ter no máximo 5MB.", variant: "destructive" });
      return;
    }

    try {
      setUploadingCount((n) => n + 1);

      // Process image to fit target dimensions
      let processedFile = file;
      if (targetDims) {
        try {
          processedFile = await processBannerImage(file, targetDims);
        } catch {
          // If processing fails, upload original
          console.warn("[AdminBanners] Image processing failed, uploading original");
        }
      }

      if (setLocalPreview) {
        const localUrl = URL.createObjectURL(processedFile);
        setLocalPreview(localUrl);
      }

      const path = await uploadToBucket(SITE_BANNERS_BUCKET, processedFile);
      setPath(path);
      toast({
        title: "Upload concluído",
        description: targetDims
          ? `Imagem redimensionada para ${targetDims.width}×${targetDims.height}px e pronta para salvar.`
          : "Imagem pronta para salvar.",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Não foi possível enviar o banner agora.";
      toast({ title: "Erro de upload", description: message, variant: "destructive" });
    } finally {
      setUploadingCount((n) => Math.max(0, n - 1));
    }
  }

  async function requestBannerEdit(sourcePath: string, prompt: string) {
    const { data, error } = await cloud.functions.invoke("edit-store-image", {
      body: {
        bucket: SITE_BANNERS_BUCKET,
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
      const normalized = normalizeBannerImagePath(newPath);
      if (!normalized) throw new Error("Caminho de imagem inválido retornado pela edição");
      setCreateForm((p) => ({ ...p, [field]: normalized }));
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
      const normalized = normalizeBannerImagePath(newPath);
      if (!normalized) throw new Error("Caminho de imagem inválido retornado pela edição");

      setEditForm((p) => ({ ...p, [field]: normalized }));
      const { error } = await cloud.from("store_banners").update({ [field]: normalized }).eq("id", editingId);
      if (error) throw error;

      invalidateSmartCache(HOME_CONTENT_CACHE_KEY);
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
    if (isUploading) {
      return toast({ title: "Aguarde", description: "Conclua o upload da imagem antes de salvar." });
    }

    const payload = buildBannerPayload(createForm);
    const hasAnyImage = Boolean(payload.image_desktop_path || payload.image_mobile_path || payload.image_path);
    if (!hasAnyImage) {
      return toast({ title: "Atenção", description: "Faça upload de ao menos uma imagem do banner." });
    }

    try {
      setSavingCreate(true);
      const { data, error } = await cloud.from("store_banners").insert(payload as any).select("id").single();
      if (error) throw error;

      const createdId = String(data?.id ?? "").trim();
      if (!createdId) throw new Error("create_missing_id");
      await verifySavedBanner(createdId, payload);

      invalidateSmartCache(HOME_CONTENT_CACHE_KEY);
      toast({ title: "Banner salvo com sucesso", description: "Banner salvo com sucesso." });
      clearLocalPreview(setCreateLocalPreview, createLocalPreview);
      setCreateForm(emptyForm());
      await load();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro inesperado ao salvar banner";
      console.error("[AdminBanners.create]", { payload, error });
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setSavingCreate(false);
    }
  };

  const startEdit = (b: Banner) => {
    const normalized = normalizeBannerRow(b);
    clearLocalPreview(setEditLocalPreview, editLocalPreview);
    setEditingId(normalized.id);
    setEditForm({
      title: normalized.title,
      subtitle: normalized.subtitle ?? "",
      image_path: normalized.image_path ?? "",
      image_desktop_path: normalized.image_desktop_path ?? "",
      image_mobile_path: normalized.image_mobile_path ?? "",
      link_url: normalized.link_url ?? "",
      button_label: normalized.button_label ?? "",
      sort_order: normalized.sort_order,
      active: normalized.active,
      preview_size_key: DEFAULT_SIZE_KEY,
    });
  };

  const saveEdit = async () => {
    if (!editingId) {
      console.error("[AdminBanners.saveEdit] bannerId ausente", { editForm });
      return toast({ title: "Erro", description: "Banner inválido para atualização.", variant: "destructive" });
    }
    if (isUploading) {
      return toast({ title: "Aguarde", description: "Conclua o upload da imagem antes de salvar." });
    }

    const payload = buildBannerPayload(editForm, true);
    const hasAnyImage = Boolean(payload.image_desktop_path || payload.image_mobile_path || payload.image_path);
    if (!hasAnyImage) {
      return toast({ title: "Atenção", description: "Faça upload de ao menos uma imagem do banner." });
    }

    try {
      setSavingEdit(true);
      const { error } = await cloud.from("store_banners").update(payload as any).eq("id", editingId);
      if (error) throw error;

      await verifySavedBanner(editingId, payload);
      invalidateSmartCache(HOME_CONTENT_CACHE_KEY);
      toast({ title: "Banner salvo com sucesso", description: "Banner salvo com sucesso." });
      clearLocalPreview(setEditLocalPreview, editLocalPreview);
      setEditingId(null);
      await load();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro inesperado ao salvar alterações";
      console.error("[AdminBanners.saveEdit]", { bannerId: editingId, payload, error });
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  const remove = async (id: string) => {
    try {
      const banner = rows.find((row) => row.id === id);
      const pathsToDelete = [banner?.image_desktop_path, banner?.image_mobile_path, banner?.image_path]
        .map((value) => normalizeBannerImagePath(value))
        .filter((value): value is string => Boolean(value));

      const { error } = await cloud.from("store_banners").delete().eq("id", id);
      if (error) throw error;

      if (pathsToDelete.length > 0) {
        await Promise.all([
          cloud.storage.from(SITE_BANNERS_BUCKET).remove(pathsToDelete),
          cloud.storage.from("banner-images").remove(pathsToDelete),
        ]);
      }

      invalidateSmartCache(HOME_CONTENT_CACHE_KEY);
      await load();
      toast({ title: "Banner removido", description: "Banner removido com sucesso." });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao remover banner";
      toast({ title: "Erro", description: message, variant: "destructive" });
    }
  };

  const toggleActive = async (b: Banner) => {
    try {
      const { error } = await cloud
        .from("store_banners")
        .update({ active: !b.active, updated_at: new Date().toISOString() })
        .eq("id", b.id);
      if (error) throw error;
      invalidateSmartCache(HOME_CONTENT_CACHE_KEY);
      await load();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao atualizar status do banner";
      console.error("[AdminBanners.toggleActive]", { bannerId: b.id, nextActive: !b.active, error });
      toast({ title: "Erro", description: message, variant: "destructive" });
    }
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
               <Label>Link de redirecionamento</Label>
              <Input
                value={createForm.link_url}
                onChange={(e) => setCreateForm((p) => ({ ...p, link_url: e.target.value }))}
                placeholder="/loja?categoria=hidraulica"
              />
            </div>
            <div className="space-y-2">
               <Label>Posição</Label>
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
              <Label>Imagem Desktop <span className="text-muted-foreground font-normal">({BANNER_DESKTOP_DIMS.width}×{BANNER_DESKTOP_DIMS.height}px)</span></Label>
                <p className="text-xs text-muted-foreground">A imagem será redimensionada automaticamente para {BANNER_DESKTOP_DIMS.width}×{BANNER_DESKTOP_DIMS.height}px.</p>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleUpload(
                      e.target.files?.[0] ?? null,
                      (path) => setCreateForm((p) => ({ ...p, image_desktop_path: path })),
                      (localUrl) => updateLocalPreview(setCreateLocalPreview, "image_desktop_path", localUrl),
                      BANNER_DESKTOP_DIMS,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Imagem Mobile <span className="text-muted-foreground font-normal">({BANNER_MOBILE_DIMS.width}×{BANNER_MOBILE_DIMS.height}px)</span></Label>
                <p className="text-xs text-muted-foreground">A imagem será redimensionada automaticamente para {BANNER_MOBILE_DIMS.width}×{BANNER_MOBILE_DIMS.height}px.</p>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleUpload(
                      e.target.files?.[0] ?? null,
                      (path) => setCreateForm((p) => ({ ...p, image_mobile_path: path })),
                      (localUrl) => updateLocalPreview(setCreateLocalPreview, "image_mobile_path", localUrl),
                      BANNER_MOBILE_DIMS,
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
              desktopSrc={createLocalPreview.image_desktop_path || getBannerImageUrls(createForm.image_desktop_path).primary}
              desktopFallbackSrc={getBannerImageUrls(createForm.image_desktop_path).legacy}
              mobileSrc={createLocalPreview.image_mobile_path || getBannerImageUrls(createForm.image_mobile_path).primary}
              mobileFallbackSrc={getBannerImageUrls(createForm.image_mobile_path).legacy}
              legacySrc={createLocalPreview.image_path || getBannerImageUrls(createForm.image_path).primary}
              size={createSize}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={create} disabled={savingCreate || isUploading}>{savingCreate ? "Salvando..." : isUploading ? "Aguardando upload..." : "Criar"}</Button>
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
                    <div className="font-medium truncate">{b.title?.trim() || "(Sem título)"}</div>
                    <div className="text-xs text-muted-foreground">Posição: {b.position ?? b.sort_order}</div>
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

                {(b.image_desktop_path || b.image_mobile_path || b.image_path) && (() => {
                  const urls = getBannerImageUrls(b.image_desktop_path || b.image_mobile_path || b.image_path);
                  return (
                    <img
                      src={urls.primary}
                      data-fallback-src={urls.legacy}
                      onError={(event) => {
                        const fallback = event.currentTarget.dataset.fallbackSrc;
                        if (!fallback) return;
                        if (event.currentTarget.src === fallback) return;
                        event.currentTarget.src = fallback;
                      }}
                      alt={`Banner ${b.title}`}
                      className="w-full h-40 object-cover rounded-xl"
                      loading="lazy"
                    />
                  );
                })()}

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
                        <Label>Link de redirecionamento</Label>
                        <Input value={editForm.link_url} onChange={(e) => setEditForm((p) => ({ ...p, link_url: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Posição</Label>
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
                          <Label>Trocar imagem Desktop <span className="text-muted-foreground font-normal">({BANNER_DESKTOP_DIMS.width}×{BANNER_DESKTOP_DIMS.height}px)</span></Label>
                          <p className="text-xs text-muted-foreground">Redimensionada automaticamente.</p>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handleUpload(
                                e.target.files?.[0] ?? null,
                                (path) => setEditForm((p) => ({ ...p, image_desktop_path: path })),
                                (localUrl) => updateLocalPreview(setEditLocalPreview, "image_desktop_path", localUrl),
                                BANNER_DESKTOP_DIMS,
                              )
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Trocar imagem Mobile <span className="text-muted-foreground font-normal">({BANNER_MOBILE_DIMS.width}×{BANNER_MOBILE_DIMS.height}px)</span></Label>
                          <p className="text-xs text-muted-foreground">Redimensionada automaticamente.</p>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handleUpload(
                                e.target.files?.[0] ?? null,
                                (path) => setEditForm((p) => ({ ...p, image_mobile_path: path })),
                                (localUrl) => updateLocalPreview(setEditLocalPreview, "image_mobile_path", localUrl),
                                BANNER_MOBILE_DIMS,
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
                        desktopSrc={editLocalPreview.image_desktop_path || getBannerImageUrls(editForm.image_desktop_path).primary}
                        desktopFallbackSrc={getBannerImageUrls(editForm.image_desktop_path).legacy}
                        mobileSrc={editLocalPreview.image_mobile_path || getBannerImageUrls(editForm.image_mobile_path).primary}
                        mobileFallbackSrc={getBannerImageUrls(editForm.image_mobile_path).legacy}
                        legacySrc={editLocalPreview.image_path || getBannerImageUrls(editForm.image_path).primary}
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
                      <Button onClick={saveEdit} disabled={savingEdit || isUploading}>{savingEdit ? "Salvando..." : isUploading ? "Aguardando upload..." : "Salvar alterações"}</Button>
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
