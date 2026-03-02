import { useEffect, useMemo, useState } from "react";
import { cloud } from "@/lib/cloud";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { publicImageUrl } from "@/utils/storage";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { invalidateSmartCache } from "@/utils/smartCache";

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

function normalizeBannerImagePath(value?: string | null) {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("blob:")) return "";

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const marker = "/storage/v1/object/public/banner-images/";
    const markerIndex = trimmed.indexOf(marker);
    if (markerIndex >= 0) {
      return decodeURIComponent(trimmed.slice(markerIndex + marker.length));
    }
    return "";
  }

  return trimmed.replace(/^\/+/, "");
}

const HOME_CONTENT_CACHE_KEY = "home_content:v1";

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

type Benefit = {
  id: string;
  title: string;
  subtitle: string | null;
  icon: string | null;
  sort_order: number;
  active: boolean;
};

type Policy = {
  id: string;
  title: string;
  subtitle: string | null;
  icon: string | null;
  link_url: string | null;
  sort_order: number;
  active: boolean;
};

type Footer = {
  id: string;
  key: string;
  logo_path: string | null;
  store_name: string | null;
  address: string | null;
  whatsapp: string | null;
  hours: string | null;
  extra_note: string | null;
  active: boolean;
};

type Category = { id: string; name: string; slug: string; featured: boolean; sort_order: number; image_path: string | null; active: boolean };

type Section = {
  id: string;
  category_id: string;
  title_override: string | null;
  subtitle_override: string | null;
  sort_order: number;
  active: boolean;
};

type Department = {
  id: string;
  kind: string;
  label: string;
  icon: string | null;
  link_url: string | null;
  category_id: string | null;
  sort_order: number;
  active: boolean;
};

type Offer = {
  id: string;
  product_id: string;
  badge_text: string | null;
  promo_price: number | null;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  active: boolean;
};

type HomeSeo = {
  id: string;
  key: string;
  meta_title: string | null;
  meta_description: string | null;
  og_image_path: string | null;
  active: boolean;
};

export default function AdminHome() {
  const [loading, setLoading] = useState(true);

  const [banners, setBanners] = useState<Banner[]>([]);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [footer, setFooter] = useState<Footer | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [seoRow, setSeoRow] = useState<HomeSeo | null>(null);

  const loadAll = async () => {
    setLoading(true);
    const [b, ben, pol, f, cats, sec, deps, off, seo] = await Promise.all([
      cloud
        .from("store_banners")
        .select(
          "id, title, subtitle, image_path, image_desktop_path, image_mobile_path, link_url, button_label, sort_order, active",
        )
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
      cloud.from("home_benefits").select("id, title, subtitle, icon, sort_order, active").order("sort_order", { ascending: true }),
      cloud
        .from("home_policies")
        .select("id, title, subtitle, icon, link_url, sort_order, active")
        .order("sort_order", { ascending: true }),
      cloud.from("home_footer").select("*").eq("key", "main").maybeSingle(),
      cloud.from("store_categories").select("id, name, slug, featured, sort_order, image_path, active").order("sort_order", { ascending: true }),
      cloud
        .from("home_sections")
        .select("id, category_id, title_override, subtitle_override, sort_order, active")
        .order("sort_order", { ascending: true }),
      cloud
        .from("home_departments")
        .select("id, kind, label, icon, link_url, category_id, sort_order, active")
        .order("sort_order", { ascending: true }),
      cloud
        .from("home_offers")
        .select("id, product_id, badge_text, promo_price, starts_at, ends_at, sort_order, active")
        .order("sort_order", { ascending: true }),
      cloud
        .from("home_seo")
        .select("id, key, meta_title, meta_description, og_image_path, active")
        .eq("key", "store_home")
        .maybeSingle(),
    ]);

    const firstError = b.error || ben.error || pol.error || f.error || cats.error || sec.error || deps.error || off.error || seo.error;
    if (firstError) toast({ title: "Erro", description: firstError.message, variant: "destructive" });

    setBanners((b.data ?? []) as any);
    setBenefits((ben.data ?? []) as any);
    setPolicies((pol.data ?? []) as any);
    setFooter((f.data as any) ?? null);
    setCategories((cats.data ?? []) as any);
    setSections((sec.data ?? []) as any);
    setDepartments((deps.data ?? []) as any);
    setOffers((off.data ?? []) as any);
    setSeoRow((seo.data as any) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const bannerUrl = (path?: string | null) => publicImageUrl("banner-images", path);
  const categoryUrl = (path?: string | null) => publicImageUrl("category-images", path);

  // --- BANNERS ---
  const [bTitle, setBTitle] = useState("");
  const [bSubtitle, setBSubtitle] = useState("");
  const [bLink, setBLink] = useState("");
  const [bButton, setBButton] = useState("");
  const [bOrder, setBOrder] = useState<number>(0);
  const [bActive, setBActive] = useState(true);
  const [bDesktopPath, setBDesktopPath] = useState<string>("");
  const [bMobilePath, setBMobilePath] = useState<string>("");

  const createBanner = async () => {
    const normalizedDesktop = normalizeBannerImagePath(bDesktopPath);
    const normalizedMobile = normalizeBannerImagePath(bMobilePath);
    if (!normalizedDesktop && !normalizedMobile) {
      return toast({ title: "Atenção", description: "Envie ao menos uma imagem (desktop ou mobile)." });
    }

    const { error } = await cloud.from("store_banners").insert({
      title: bTitle.trim(),
      subtitle: bSubtitle.trim() || null,
      link_url: bLink.trim() || null,
      button_label: bButton.trim() || null,
      sort_order: Number(bOrder) || 0,
      active: bActive,
      image_desktop_path: normalizedDesktop || null,
      image_mobile_path: normalizedMobile || null,
    } as any);

    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });

    invalidateSmartCache(HOME_CONTENT_CACHE_KEY);
    toast({ title: "Criado", description: "Banner adicionado e refletido na Home" });
    setBTitle("");
    setBSubtitle("");
    setBLink("");
    setBButton("");
    setBOrder(0);
    setBActive(true);
    setBDesktopPath("");
    setBMobilePath("");
    await loadAll();
  };

  const uploadBannerImage = async (file: File | null, kind: "desktop" | "mobile") => {
    if (!file) return;
    try {
      const path = await uploadToBucket("banner-images", file);
      if (kind === "desktop") setBDesktopPath(path);
      else setBMobilePath(path);
      toast({ title: "Upload concluído", description: `Imagem ${kind} pronta` });
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? "Falha no upload", variant: "destructive" });
    }
  };

  const updateBanner = async (id: string, patch: Partial<Banner>) => {
    const normalizedPatch: Partial<Banner> = {
      ...patch,
      image_desktop_path:
        patch.image_desktop_path === undefined ? undefined : normalizeBannerImagePath(patch.image_desktop_path) || null,
      image_mobile_path:
        patch.image_mobile_path === undefined ? undefined : normalizeBannerImagePath(patch.image_mobile_path) || null,
      image_path: patch.image_path === undefined ? undefined : normalizeBannerImagePath(patch.image_path) || null,
    };

    const { error } = await cloud.from("store_banners").update(normalizedPatch as any).eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    invalidateSmartCache(HOME_CONTENT_CACHE_KEY);
    await loadAll();
  };

  const removeBanner = async (id: string) => {
    const { error } = await cloud.from("store_banners").delete().eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    invalidateSmartCache(HOME_CONTENT_CACHE_KEY);
    await loadAll();
  };

  // --- BENEFITS ---
  const [benTitle, setBenTitle] = useState("");
  const [benSubtitle, setBenSubtitle] = useState("");
  const [benIcon, setBenIcon] = useState("truck");
  const [benOrder, setBenOrder] = useState<number>(0);
  const [benActive, setBenActive] = useState(true);

  const createBenefit = async () => {
    const t = benTitle.trim();
    if (!t) return toast({ title: "Atenção", description: "Informe o título." });

    const { error } = await cloud.from("home_benefits").insert({
      title: t,
      subtitle: benSubtitle.trim() || null,
      icon: benIcon || null,
      sort_order: Number(benOrder) || 0,
      active: benActive,
    } as any);

    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setBenTitle("");
    setBenSubtitle("");
    setBenIcon("truck");
    setBenOrder(0);
    setBenActive(true);
    await loadAll();
  };

  const updateBenefit = async (id: string, patch: Partial<Benefit>) => {
    const { error } = await cloud.from("home_benefits").update(patch as any).eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    await loadAll();
  };

  const removeBenefit = async (id: string) => {
    const { error } = await cloud.from("home_benefits").delete().eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    await loadAll();
  };

  // --- FEATURED CATEGORIES ---
  const featuredCats = useMemo(() => categories.filter((c) => c.featured && c.active), [categories]);

  const toggleFeatured = async (c: Category) => {
    const { error } = await cloud.from("store_categories").update({ featured: !c.featured } as any).eq("id", c.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    await loadAll();
  };

  const updateCategory = async (id: string, patch: Partial<Category>) => {
    const { error } = await cloud.from("store_categories").update(patch as any).eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    await loadAll();
  };

  const uploadCategoryImage = async (c: Category, file: File | null) => {
    if (!file) return;
    try {
      const path = await uploadToBucket("category-images", file);
      await updateCategory(c.id, { image_path: path } as any);
      toast({ title: "Upload concluído", description: "Imagem da categoria atualizada" });
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? "Falha no upload", variant: "destructive" });
    }
  };

  // --- SECTIONS ---
  const [secCategoryId, setSecCategoryId] = useState<string>("");
  const [secOrder, setSecOrder] = useState<number>(0);
  const [secActive, setSecActive] = useState(true);
  const [secTitle, setSecTitle] = useState("");
  const [secSubtitle, setSecSubtitle] = useState("");

  const createSection = async () => {
    if (!secCategoryId) return toast({ title: "Atenção", description: "Selecione uma categoria." });
    const { error } = await cloud.from("home_sections").insert({
      category_id: secCategoryId,
      sort_order: Number(secOrder) || 0,
      active: secActive,
      title_override: secTitle.trim() || null,
      subtitle_override: secSubtitle.trim() || null,
    } as any);

    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setSecCategoryId("");
    setSecOrder(0);
    setSecActive(true);
    setSecTitle("");
    setSecSubtitle("");
    await loadAll();
  };

  const updateSection = async (id: string, patch: Partial<Section>) => {
    const { error } = await cloud.from("home_sections").update(patch as any).eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    await loadAll();
  };

  const removeSection = async (id: string) => {
    const { error } = await cloud.from("home_sections").delete().eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    await loadAll();
  };

  // --- DEPARTMENTS ---
  const [depKind, setDepKind] = useState<string>("link");
  const [depLabel, setDepLabel] = useState("");
  const [depIcon, setDepIcon] = useState("boxes");
  const [depLink, setDepLink] = useState("");
  const [depCategoryId, setDepCategoryId] = useState<string>("");
  const [depOrder, setDepOrder] = useState<number>(0);
  const [depActive, setDepActive] = useState(true);

  const createDepartment = async () => {
    const label = depLabel.trim();
    if (!label) return toast({ title: "Atenção", description: "Informe o rótulo." });

    const patch: any = {
      kind: depKind,
      label,
      icon: depIcon.trim() || null,
      sort_order: Number(depOrder) || 0,
      active: depActive,
      link_url: depKind === "link" ? depLink.trim() || null : null,
      category_id: depKind === "category" ? depCategoryId || null : null,
    };

    // When category type, auto-generate link for catalog filter
    if (depKind === "category" && depCategoryId) {
      const c = categories.find((x) => x.id === depCategoryId);
      patch.link_url = c ? `/loja?categoria=${encodeURIComponent(c.slug)}` : null;
    }

    const { error } = await cloud.from("home_departments").insert(patch);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });

    setDepKind("link");
    setDepLabel("");
    setDepIcon("boxes");
    setDepLink("");
    setDepCategoryId("");
    setDepOrder(0);
    setDepActive(true);
    await loadAll();
  };

  const updateDepartment = async (id: string, patch: Partial<Department>) => {
    const { error } = await cloud.from("home_departments").update(patch as any).eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    await loadAll();
  };

  const removeDepartment = async (id: string) => {
    const { error } = await cloud.from("home_departments").delete().eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    await loadAll();
  };

  // --- POLICIES ---
  const [polTitle, setPolTitle] = useState("");
  const [polSubtitle, setPolSubtitle] = useState("");
  const [polIcon, setPolIcon] = useState("truck");
  const [polLink, setPolLink] = useState("/p/politica-de-privacidade");
  const [polOrder, setPolOrder] = useState<number>(0);
  const [polActive, setPolActive] = useState(true);

  const createPolicy = async () => {
    const t = polTitle.trim();
    if (!t) return toast({ title: "Atenção", description: "Informe o título." });

    const { error } = await cloud.from("home_policies").insert({
      title: t,
      subtitle: polSubtitle.trim() || null,
      icon: polIcon || null,
      link_url: polLink.trim() || null,
      sort_order: Number(polOrder) || 0,
      active: polActive,
    } as any);

    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setPolTitle("");
    setPolSubtitle("");
    setPolIcon("truck");
    setPolLink("/p/politica-de-privacidade");
    setPolOrder(0);
    setPolActive(true);
    await loadAll();
  };

  const updatePolicy = async (id: string, patch: Partial<Policy>) => {
    const { error } = await cloud.from("home_policies").update(patch as any).eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    await loadAll();
  };

  const removePolicy = async (id: string) => {
    const { error } = await cloud.from("home_policies").delete().eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    await loadAll();
  };

  // --- FOOTER ---
  const [ftStoreName, setFtStoreName] = useState("");
  const [ftAddress, setFtAddress] = useState("");
  const [ftWhatsapp, setFtWhatsapp] = useState("");
  const [ftHours, setFtHours] = useState("");
  const [ftExtra, setFtExtra] = useState("");
  const [ftLogoPath, setFtLogoPath] = useState<string>("");

  useEffect(() => {
    if (!footer) return;
    setFtStoreName(footer.store_name ?? "");
    setFtAddress(footer.address ?? "");
    setFtWhatsapp(footer.whatsapp ?? "");
    setFtHours(footer.hours ?? "");
    setFtExtra(footer.extra_note ?? "");
    setFtLogoPath(footer.logo_path ?? "");
  }, [footer?.id]);

  const saveFooter = async () => {
    if (!footer) return;
    const { error } = await cloud
      .from("home_footer")
      .update({
        store_name: ftStoreName.trim() || null,
        address: ftAddress.trim() || null,
        whatsapp: ftWhatsapp.trim() || null,
        hours: ftHours.trim() || null,
        extra_note: ftExtra.trim() || null,
        logo_path: ftLogoPath || null,
      } as any)
      .eq("id", footer.id);

    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Salvo", description: "Rodapé atualizado" });
    await loadAll();
  };

  const uploadFooterLogo = async (file: File | null) => {
    if (!file) return;
    try {
      const path = await uploadToBucket("banner-images", file);
      setFtLogoPath(path);
      toast({ title: "Upload concluído", description: "Logo pronta" });
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? "Falha no upload", variant: "destructive" });
    }
  };

  const iconsBenefit = ["truck", "badge-percent", "shield-check", "store"];
  const iconsPolicy = ["truck", "refresh-cw", "badge-check", "credit-card"];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Home</h1>
        <p className="text-sm text-muted-foreground">Edite a vitrine de vendas sem mexer no código.</p>
      </div>

      <Tabs defaultValue="banners">
        <TabsList className="w-full justify-start flex-wrap h-auto">
          <TabsTrigger value="banners">Banners</TabsTrigger>
          <TabsTrigger value="departamentos">Departamentos</TabsTrigger>
          <TabsTrigger value="vantagens">Vantagens</TabsTrigger>
          <TabsTrigger value="ofertas">Ofertas</TabsTrigger>
          <TabsTrigger value="categorias">Categorias destaque</TabsTrigger>
          <TabsTrigger value="sessoes">Sessões produtos</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="politicas">Políticas</TabsTrigger>
          <TabsTrigger value="rodape">Rodapé</TabsTrigger>
        </TabsList>

        <TabsContent value="banners" className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Novo banner</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input value={bTitle} onChange={(e) => setBTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Subtítulo</Label>
                  <Input value={bSubtitle} onChange={(e) => setBSubtitle(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Link destino</Label>
                  <Input value={bLink} onChange={(e) => setBLink(e.target.value)} placeholder="/loja?categoria=hidraulica" />
                </div>
                <div className="space-y-2">
                  <Label>Texto do botão</Label>
                  <Input value={bButton} onChange={(e) => setBButton(e.target.value)} placeholder="Ver ofertas" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Ordem</Label>
                  <Input type="number" value={bOrder} onChange={(e) => setBOrder(Number(e.target.value) || 0)} />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border p-4">
                  <div>
                    <div className="font-medium">Ativo</div>
                    <div className="text-sm text-muted-foreground">Aparece na Home.</div>
                  </div>
                  <Switch checked={bActive} onCheckedChange={setBActive} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Imagem desktop</Label>
                  <Input type="file" accept="image/*" onChange={(e) => uploadBannerImage(e.target.files?.[0] ?? null, "desktop")} />
                  {bDesktopPath ? <img src={bannerUrl(bDesktopPath)} alt="Prévia desktop" className="w-full h-40 object-cover rounded-xl" loading="lazy" /> : null}
                </div>
                <div className="space-y-2">
                  <Label>Imagem mobile</Label>
                  <Input type="file" accept="image/*" onChange={(e) => uploadBannerImage(e.target.files?.[0] ?? null, "mobile")} />
                  {bMobilePath ? <img src={bannerUrl(bMobilePath)} alt="Prévia mobile" className="w-full h-40 object-cover rounded-xl" loading="lazy" /> : null}
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={createBanner}>Criar</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Lista</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="text-muted-foreground">Carregando...</div>
              ) : banners.length === 0 ? (
                <div className="text-muted-foreground">Nenhum banner.</div>
              ) : (
                banners.map((b) => (
                  <div key={b.id} className="rounded-xl border border-border bg-card/60 backdrop-blur p-3 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{b.title}</div>
                        <div className="text-xs text-muted-foreground">Ordem: {b.sort_order}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => updateBanner(b.id, { active: !b.active })}>
                          {b.active ? "Desativar" : "Ativar"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => removeBanner(b.id)}>
                          Remover
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Imagem desktop</Label>
                        {b.image_desktop_path ? (
                          <img src={bannerUrl(b.image_desktop_path)} alt="Banner desktop" className="w-full h-32 object-cover rounded-xl" loading="lazy" />
                        ) : (
                          <div className="text-xs text-muted-foreground">(sem imagem)</div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Imagem mobile</Label>
                        {b.image_mobile_path ? (
                          <img src={bannerUrl(b.image_mobile_path)} alt="Banner mobile" className="w-full h-32 object-cover rounded-xl" loading="lazy" />
                        ) : (
                          <div className="text-xs text-muted-foreground">(sem imagem)</div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label>Ordem</Label>
                        <Input
                          type="number"
                          value={b.sort_order}
                          onChange={(e) => updateBanner(b.id, { sort_order: Number(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Link</Label>
                        <Input value={b.link_url ?? ""} onChange={(e) => updateBanner(b.id, { link_url: e.target.value.trim() || null })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Botão</Label>
                        <Input
                          value={b.button_label ?? ""}
                          onChange={(e) => updateBanner(b.id, { button_label: e.target.value.trim() || null })}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departamentos" className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Novo departamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={depKind} onValueChange={setDepKind}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="link">Link</SelectItem>
                      <SelectItem value="category">Categoria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Rótulo</Label>
                  <Input value={depLabel} onChange={(e) => setDepLabel(e.target.value)} placeholder="Ex.: Hidráulica" />
                </div>

                <div className="space-y-2">
                  <Label>Ícone (lucide)</Label>
                  <Input value={depIcon} onChange={(e) => setDepIcon(e.target.value)} placeholder="boxes / badge-percent / message-circle" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Link (quando tipo=link)</Label>
                  <Input value={depLink} onChange={(e) => setDepLink(e.target.value)} placeholder="/loja?categoria=hidraulica" />
                </div>

                <div className="space-y-2">
                  <Label>Categoria (quando tipo=categoria)</Label>
                  <Select value={depCategoryId} onValueChange={setDepCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
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
                  <Label>Ordem</Label>
                  <Input type="number" value={depOrder} onChange={(e) => setDepOrder(Number(e.target.value) || 0)} />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border p-4">
                <div>
                  <div className="font-medium">Ativo</div>
                  <div className="text-sm text-muted-foreground">Aparece na barra de departamentos.</div>
                </div>
                <Switch checked={depActive} onCheckedChange={setDepActive} />
              </div>

              <div className="flex justify-end">
                <Button onClick={createDepartment}>Criar</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Lista</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="text-muted-foreground">Carregando...</div>
              ) : departments.length === 0 ? (
                <div className="text-muted-foreground">Nenhum departamento.</div>
              ) : (
                departments.map((d) => (
                  <div key={d.id} className="rounded-xl border border-border bg-card/60 backdrop-blur p-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{d.label}</div>
                        <div className="text-xs text-muted-foreground">
                          tipo: {d.kind} • ícone: {d.icon ?? "-"} • ordem: {d.sort_order}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => updateDepartment(d.id, { active: !d.active })}>
                          {d.active ? "Desativar" : "Ativar"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => removeDepartment(d.id)}>
                          Remover
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="space-y-2">
                        <Label>Ordem</Label>
                        <Input type="number" value={d.sort_order} onChange={(e) => updateDepartment(d.id, { sort_order: Number(e.target.value) || 0 })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Rótulo</Label>
                        <Input value={d.label} onChange={(e) => updateDepartment(d.id, { label: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Ícone</Label>
                        <Input value={d.icon ?? ""} onChange={(e) => updateDepartment(d.id, { icon: e.target.value.trim() || null })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Link</Label>
                        <Input value={d.link_url ?? ""} onChange={(e) => updateDepartment(d.id, { link_url: e.target.value.trim() || null })} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vantagens" className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Nova vantagem</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input value={benTitle} onChange={(e) => setBenTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Subtítulo</Label>
                  <Input value={benSubtitle} onChange={(e) => setBenSubtitle(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Ícone</Label>
                  <Select value={benIcon} onValueChange={setBenIcon}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {iconsBenefit.map((x) => (
                        <SelectItem key={x} value={x}>
                          {x}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ordem</Label>
                  <Input type="number" value={benOrder} onChange={(e) => setBenOrder(Number(e.target.value) || 0)} />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border p-4">
                  <div>
                    <div className="font-medium">Ativo</div>
                    <div className="text-sm text-muted-foreground">Aparece na faixa.</div>
                  </div>
                  <Switch checked={benActive} onCheckedChange={setBenActive} />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={createBenefit}>Criar</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Lista</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="text-muted-foreground">Carregando...</div>
              ) : benefits.length === 0 ? (
                <div className="text-muted-foreground">Nenhuma vantagem.</div>
              ) : (
                benefits.map((b) => (
                  <div key={b.id} className="rounded-xl border border-border bg-card/60 backdrop-blur p-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <div className="font-medium">{b.title}</div>
                        <div className="text-xs text-muted-foreground">Ícone: {b.icon ?? "-"} • Ordem: {b.sort_order}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => updateBenefit(b.id, { active: !b.active })}>
                          {b.active ? "Desativar" : "Ativar"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => removeBenefit(b.id)}>
                          Remover
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label>Ordem</Label>
                        <Input type="number" value={b.sort_order} onChange={(e) => updateBenefit(b.id, { sort_order: Number(e.target.value) || 0 })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Ícone</Label>
                        <Input value={b.icon ?? ""} onChange={(e) => updateBenefit(b.id, { icon: e.target.value.trim() || null })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Subtítulo</Label>
                        <Input value={b.subtitle ?? ""} onChange={(e) => updateBenefit(b.id, { subtitle: e.target.value.trim() || null })} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ofertas" className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Ofertas da semana</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                Nesta etapa, as ofertas podem ser curadas adicionando produtos em <code>home_offers</code>.
                Se não houver ofertas curadas, a Home faz fallback automático para produtos com <code>promo_price</code>.
              </p>
              <p>
                Próximo passo: UI completa de curadoria (selecionar produto, preço promo opcional, validade e ordenação).
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>SEO da Home</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!seoRow ? (
                <div className="text-sm text-muted-foreground">Registro de SEO não encontrado. Recarregue a página.</div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Meta title (até ~60 caracteres)</Label>
                    <Input value={seoRow.meta_title ?? ""} onChange={(e) => setSeoRow({ ...seoRow, meta_title: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Meta description (até ~160 caracteres)</Label>
                    <Textarea value={seoRow.meta_description ?? ""} onChange={(e) => setSeoRow({ ...seoRow, meta_description: e.target.value })} />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={async () => {
                        const { error } = await cloud
                          .from("home_seo")
                          .update({
                            meta_title: (seoRow.meta_title ?? "").trim() || null,
                            meta_description: (seoRow.meta_description ?? "").trim() || null,
                          } as any)
                          .eq("id", seoRow.id);
                        if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
                        toast({ title: "Salvo", description: "SEO atualizado" });
                        await loadAll();
                      }}
                    >
                      Salvar
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categorias" className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Categorias</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">Marque como destaque, ajuste ordem e imagem.</div>
              {loading ? (
                <div className="text-muted-foreground">Carregando...</div>
              ) : (
                <div className="space-y-3">
                  {categories.map((c) => (
                    <div key={c.id} className="rounded-xl border border-border bg-card/60 backdrop-blur p-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-12 w-16 rounded-lg overflow-hidden border border-border bg-muted/20 shrink-0">
                            {c.image_path ? (
                              <img src={categoryUrl(c.image_path)} alt={`Imagem ${c.name}`} className="h-full w-full object-cover" loading="lazy" />
                            ) : (
                              <div className="h-full w-full fortlev-gradient opacity-50" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{c.name}</div>
                            <div className="text-xs text-muted-foreground">slug: {c.slug}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button size="sm" variant={c.featured ? "default" : "outline"} onClick={() => toggleFeatured(c)}>
                            {c.featured ? "Destaque" : "Sem destaque"}
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label>Ordem</Label>
                          <Input type="number" value={c.sort_order} onChange={(e) => updateCategory(c.id, { sort_order: Number(e.target.value) || 0 } as any)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Imagem</Label>
                          <Input type="file" accept="image/*" onChange={(e) => uploadCategoryImage(c, e.target.files?.[0] ?? null)} />
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-border p-4">
                          <div>
                            <div className="font-medium">Ativa</div>
                            <div className="text-sm text-muted-foreground">Aparece na loja.</div>
                          </div>
                          <Switch checked={c.active} onCheckedChange={(v) => updateCategory(c.id, { active: v } as any)} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-xs text-muted-foreground">Em destaque: {featuredCats.length} categorias</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessoes" className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Nova sessão (por categoria)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={secCategoryId} onValueChange={setSecCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
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
                  <Label>Ordem</Label>
                  <Input type="number" value={secOrder} onChange={(e) => setSecOrder(Number(e.target.value) || 0)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Título (opcional)</Label>
                  <Input value={secTitle} onChange={(e) => setSecTitle(e.target.value)} placeholder="Ex.: Cimento" />
                </div>
                <div className="space-y-2">
                  <Label>Subtítulo (opcional)</Label>
                  <Input value={secSubtitle} onChange={(e) => setSecSubtitle(e.target.value)} placeholder="Ex.: Os mais vendidos" />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border p-4">
                <div>
                  <div className="font-medium">Ativa</div>
                  <div className="text-sm text-muted-foreground">Aparece na vitrine.</div>
                </div>
                <Switch checked={secActive} onCheckedChange={setSecActive} />
              </div>

              <div className="flex justify-end">
                <Button onClick={createSection}>Criar</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Lista</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="text-muted-foreground">Carregando...</div>
              ) : sections.length === 0 ? (
                <div className="text-muted-foreground">Nenhuma sessão criada (a Home usará todas as categorias ativas como fallback).</div>
              ) : (
                sections.map((s) => {
                  const c = categories.find((x) => x.id === s.category_id);
                  return (
                    <div key={s.id} className="rounded-xl border border-border bg-card/60 backdrop-blur p-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{s.title_override || c?.name || "Categoria"}</div>
                          <div className="text-xs text-muted-foreground">Ordem: {s.sort_order} • {s.active ? "ativa" : "inativa"}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => updateSection(s.id, { active: !s.active })}>
                            {s.active ? "Desativar" : "Ativar"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => removeSection(s.id)}>
                            Remover
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label>Ordem</Label>
                          <Input type="number" value={s.sort_order} onChange={(e) => updateSection(s.id, { sort_order: Number(e.target.value) || 0 })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Título</Label>
                          <Input value={s.title_override ?? ""} onChange={(e) => updateSection(s.id, { title_override: e.target.value.trim() || null })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Subtítulo</Label>
                          <Input value={s.subtitle_override ?? ""} onChange={(e) => updateSection(s.id, { subtitle_override: e.target.value.trim() || null })} />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="politicas" className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Nova política</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input value={polTitle} onChange={(e) => setPolTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Subtítulo</Label>
                  <Input value={polSubtitle} onChange={(e) => setPolSubtitle(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Ícone</Label>
                  <Select value={polIcon} onValueChange={setPolIcon}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {iconsPolicy.map((x) => (
                        <SelectItem key={x} value={x}>
                          {x}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Link</Label>
                  <Input value={polLink} onChange={(e) => setPolLink(e.target.value)} placeholder="/p/entrega" />
                </div>
                <div className="space-y-2">
                  <Label>Ordem</Label>
                  <Input type="number" value={polOrder} onChange={(e) => setPolOrder(Number(e.target.value) || 0)} />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border p-4">
                <div>
                  <div className="font-medium">Ativa</div>
                  <div className="text-sm text-muted-foreground">Aparece na Home.</div>
                </div>
                <Switch checked={polActive} onCheckedChange={setPolActive} />
              </div>

              <div className="flex justify-end">
                <Button onClick={createPolicy}>Criar</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Lista</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="text-muted-foreground">Carregando...</div>
              ) : policies.length === 0 ? (
                <div className="text-muted-foreground">Nenhuma política.</div>
              ) : (
                policies.map((p) => (
                  <div key={p.id} className="rounded-xl border border-border bg-card/60 backdrop-blur p-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <div className="font-medium">{p.title}</div>
                        <div className="text-xs text-muted-foreground">Ícone: {p.icon ?? "-"} • Ordem: {p.sort_order}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => updatePolicy(p.id, { active: !p.active })}>
                          {p.active ? "Desativar" : "Ativar"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => removePolicy(p.id)}>
                          Remover
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label>Ordem</Label>
                        <Input type="number" value={p.sort_order} onChange={(e) => updatePolicy(p.id, { sort_order: Number(e.target.value) || 0 })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Link</Label>
                        <Input value={p.link_url ?? ""} onChange={(e) => updatePolicy(p.id, { link_url: e.target.value.trim() || null })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Subtítulo</Label>
                        <Input value={p.subtitle ?? ""} onChange={(e) => updatePolicy(p.id, { subtitle: e.target.value.trim() || null })} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rodape" className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Rodapé</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!footer ? (
                <div className="text-muted-foreground">Rodapé não encontrado (seed falhou). Recarregue a página.</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Nome da loja</Label>
                      <Input value={ftStoreName} onChange={(e) => setFtStoreName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>WhatsApp</Label>
                      <Input value={ftWhatsapp} onChange={(e) => setFtWhatsapp(e.target.value)} placeholder="31973484203" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Endereço</Label>
                    <Textarea value={ftAddress} onChange={(e) => setFtAddress(e.target.value)} placeholder="Rua..., Bairro..., Cidade/UF" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Horário</Label>
                      <Input value={ftHours} onChange={(e) => setFtHours(e.target.value)} placeholder="Seg a Sex: 8h às 18h" />
                    </div>
                    <div className="space-y-2">
                      <Label>Nota extra</Label>
                      <Input value={ftExtra} onChange={(e) => setFtExtra(e.target.value)} placeholder="Ex.: Entregas para toda região" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Logo</Label>
                    <Input type="file" accept="image/*" onChange={(e) => uploadFooterLogo(e.target.files?.[0] ?? null)} />
                    {ftLogoPath ? <img src={bannerUrl(ftLogoPath)} alt="Logo" className="h-14 w-auto" loading="lazy" /> : null}
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={saveFooter}>Salvar</Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
