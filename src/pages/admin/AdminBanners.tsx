import { useEffect, useState } from "react";
import { cloud } from "@/lib/cloud";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_path: string | null;
  link_url: string | null;
  button_label: string | null;
  sort_order: number;
  active: boolean;
};

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

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [buttonLabel, setButtonLabel] = useState("");
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [active, setActive] = useState(true);
  const [imagePath, setImagePath] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await cloud
      .from("store_banners")
      .select("id, title, subtitle, image_path, link_url, button_label, sort_order, active")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    setRows((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const imageUrl = (path: string) => cloud.storage.from("banner-images").getPublicUrl(path).data.publicUrl;

  const create = async () => {
    const t = title.trim();
    if (!t) return toast({ title: "Atenção", description: "Informe o título." });

    const { error } = await cloud.from("store_banners").insert({
      title: t,
      subtitle: subtitle.trim() || null,
      image_path: imagePath || null,
      link_url: linkUrl.trim() || null,
      button_label: buttonLabel.trim() || null,
      sort_order: Number(sortOrder) || 0,
      active,
    } as any);

    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });

    toast({ title: "Criado", description: "Banner adicionado" });
    setTitle("");
    setSubtitle("");
    setLinkUrl("");
    setButtonLabel("");
    setSortOrder(0);
    setActive(true);
    setImagePath("");
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

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    try {
      const path = await uploadToBucket("banner-images", file);
      setImagePath(path);
      toast({ title: "Upload concluído", description: "Imagem pronta" });
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? "Falha no upload", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Banners</h1>
        <p className="text-sm text-muted-foreground">Hero da Home (ordem e ativo).</p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Novo banner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Subtítulo</Label>
              <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Link</Label>
              <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="/loja?categoria=hidraulica" />
            </div>
            <div className="space-y-2">
              <Label>Texto do botão</Label>
              <Input value={buttonLabel} onChange={(e) => setButtonLabel(e.target.value)} placeholder="Ver ofertas" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Ordem</Label>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value) || 0)} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-4">
              <div>
                <div className="font-medium">Ativo</div>
                <div className="text-sm text-muted-foreground">Aparece na Home.</div>
              </div>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Imagem</Label>
            <Input type="file" accept="image/*" onChange={(e) => handleUpload(e.target.files?.[0] ?? null)} />
            {imagePath ? (
              <img src={imageUrl(imagePath)} alt="Prévia do banner" className="w-full h-48 object-cover rounded-xl" loading="lazy" />
            ) : null}
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
              <div key={b.id} className="rounded-xl border border-border bg-card/60 backdrop-blur p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{b.title}</div>
                    <div className="text-xs text-muted-foreground">Ordem: {b.sort_order}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => toggleActive(b)}>{b.active ? "Desativar" : "Ativar"}</Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(b.id)}>Remover</Button>
                  </div>
                </div>
                {b.image_path ? (
                  <img src={imageUrl(b.image_path)} alt="Banner" className="mt-3 w-full h-40 object-cover rounded-xl" loading="lazy" />
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
