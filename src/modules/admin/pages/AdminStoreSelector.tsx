import { useEffect, useState, useCallback } from "react";
import { ALL_MODULES, MODULE_LABELS, type StoreModule } from "@/hooks/useStorePermissions";
import { useNavigate } from "react-router-dom";
import { cloud } from "@/lib/cloud";
import { useSession } from "@/hooks/useSession";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Store,
  ShoppingCart,
  Package,
  Users,
  ArrowRight,
  Crown,
  Building2,
  Plus,
  Globe,
  Settings2,
  Image as ImageIcon,
  ExternalLink,
  Pencil,
  X,
  Check,
  Link2,
  Shield,
  Sparkles,
  BarChart3,
  Pause,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import type { AppStore } from "@/contexts/StoreContext";

type StoreRow = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  domain: string | null;
  favicon_path: string | null;
  plan_id: string | null;
  segment: string | null;
  suspended: boolean;
};

type StoreDomain = {
  id: string;
  store_id: string;
  domain: string;
  is_primary: boolean;
  verified: boolean;
};

type PlanRow = { id: string; name: string; slug: string; modules: string[] };

type StoreSummary = {
  store: StoreRow;
  orderCount: number;
  productCount: number;
  domains: StoreDomain[];
  planName: string;
};

type SeoData = {
  meta_title: string;
  meta_description: string;
  og_image_path: string;
};

export default function AdminStoreSelector() {
  const navigate = useNavigate();
  const { user } = useSession();
  const { isMaster, storeAccess, loading: permLoading } = useAdminPermissions();
  const { setStore, setActiveStoreId } = useStore();
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [summaries, setSummaries] = useState<StoreSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [newStoreSlug, setNewStoreSlug] = useState("");
  const [newStoreDomain, setNewStoreDomain] = useState("");
  const [newStorePlan, setNewStorePlan] = useState("");
  const [newStoreSegment, setNewStoreSegment] = useState("");
  const [creating, setCreating] = useState(false);

  // AI Creation
  const [aiCreateOpen, setAiCreateOpen] = useState(false);
  const [aiName, setAiName] = useState("");
  const [aiSegment, setAiSegment] = useState("");
  const [aiStyle, setAiStyle] = useState("moderno");
  const [aiPlanSlug, setAiPlanSlug] = useState("basico");
  const [aiCreating, setAiCreating] = useState(false);

  const [plans, setPlans] = useState<PlanRow[]>([]);

  const [seoOpen, setSeoOpen] = useState(false);
  const [seoStoreId, setSeoStoreId] = useState<string | null>(null);
  const [seoData, setSeoData] = useState<SeoData>({ meta_title: "", meta_description: "", og_image_path: "" });
  const [savingSeo, setSavingSeo] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailStore, setDetailStore] = useState<StoreSummary | null>(null);

  // Permissions dialog
  const [permOpen, setPermOpen] = useState(false);
  const [permStoreId, setPermStoreId] = useState<string | null>(null);
  const [permModules, setPermModules] = useState<Record<string, boolean>>({});
  const [savingPerm, setSavingPerm] = useState(false);

  useEffect(() => {
    if (permLoading) return;
    loadStores();
  }, [permLoading, isMaster, storeAccess]);

  const loadStores = async () => {
    setLoading(true);
    const query = cloud
      .from("stores")
      .select("id, name, slug, active, domain, favicon_path, plan_id, segment, suspended")
      .order("name");

    if (!isMaster) {
      query.eq("active", true);
    }

    const [{ data }, { data: plansData }] = await Promise.all([
      query,
      cloud.from("store_plans").select("id, name, slug, modules").order("sort_order"),
    ]);

    const allPlans = (plansData as PlanRow[]) ?? [];
    setPlans(allPlans);

    let available = (data as StoreRow[]) ?? [];

    if (!isMaster && storeAccess.length > 0) {
      const allowedIds = new Set(storeAccess.map((s) => s.store_id));
      available = available.filter((s) => allowedIds.has(s.id));
    }

    setStores(available);

    if (!isMaster && available.length === 1) {
      enterStore(available[0]);
      return;
    }

    const storeIds = available.map((s) => s.id);
    const { data: domains } = await cloud
      .from("store_domains")
      .select("id, store_id, domain, is_primary, verified")
      .in("store_id", storeIds.length > 0 ? storeIds : ["__none__"]);

    const allDomains = (domains as StoreDomain[]) ?? [];

    const [{ count: orderCount }, { count: productCount }] = await Promise.all([
      cloud.from("store_orders").select("*", { count: "exact", head: true }),
      cloud.from("store_products").select("*", { count: "exact", head: true }).eq("active", true),
    ]);

    const sums: StoreSummary[] = available.map((store) => {
      const plan = allPlans.find((p) => p.id === store.plan_id);
      return {
        store,
        orderCount: store.slug === "construcao" ? (orderCount ?? 0) : 0,
        productCount: store.slug === "construcao" ? (productCount ?? 0) : 0,
        domains: allDomains.filter((d) => d.store_id === store.id),
        planName: plan?.name ?? "Sem plano",
      };
    });

    setSummaries(sums);
    setLoading(false);
  };

  const enterStore = (storeRow: StoreRow) => {
    setStore(storeRow.slug);
    setActiveStoreId(storeRow.id);
    navigate("/admin/dashboard");
  };

  const storeIcon = (slug: string) => {
    if (slug === "materiais") return <Building2 className="w-6 h-6" />;
    if (slug === "fortlev") return <Package className="w-6 h-6" />;
    return <Store className="w-6 h-6" />;
  };

  const getStoreDomain = (store: StoreRow, domains: StoreDomain[]) => {
    const primary = domains.find((d) => d.is_primary);
    if (primary) return primary.domain;
    if (store.domain) return store.domain;
    if (domains.length > 0) return domains[0].domain;
    return `${store.slug}.lovable.app`;
  };

  // --- Create Store ---
  const handleCreateStore = async () => {
    if (!newStoreName.trim() || !newStoreSlug.trim()) {
      toast.error("Nome e slug são obrigatórios");
      return;
    }
    setCreating(true);
    const planObj = plans.find((p) => p.slug === newStorePlan);
    const { data: newStore, error } = await cloud.from("stores").insert({
      name: newStoreName.trim(),
      slug: newStoreSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, ""),
      active: true,
      domain: newStoreDomain.trim() || null,
      segment: newStoreSegment.trim() || null,
      plan_id: planObj?.id ?? null,
    }).select("id").single();
    if (error) {
      toast.error("Erro ao criar loja: " + error.message);
    } else {
      if (newStore?.id) {
        if (planObj) {
          await cloud.rpc("apply_plan_permissions", { _store_id: newStore.id, _plan_id: planObj.id });
        } else {
          await cloud.rpc("init_store_permissions", { _store_id: newStore.id });
        }
      }
      toast.success("Loja criada com sucesso!");
      setCreateOpen(false);
      setNewStoreName("");
      setNewStoreSlug("");
      setNewStoreDomain("");
      setNewStorePlan("");
      setNewStoreSegment("");
      loadStores();
    }
    setCreating(false);
  };

  // --- AI Create Store ---
  const handleAiCreateStore = async () => {
    if (!aiName.trim() || !aiSegment.trim()) {
      toast.error("Nome e segmento são obrigatórios");
      return;
    }
    setAiCreating(true);
    try {
      const { data, error } = await cloud.functions.invoke("ai-create-store", {
        body: {
          name: aiName.trim(),
          segment: aiSegment.trim(),
          style: aiStyle,
          plan_slug: aiPlanSlug,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(
        `Loja criada! ${data.categories_created} categorias e ${data.products_created} produtos gerados.`
      );
      setAiCreateOpen(false);
      setAiName("");
      setAiSegment("");
      loadStores();
    } catch (e: any) {
      toast.error("Erro ao criar loja com IA: " + (e.message ?? "Erro desconhecido"));
    } finally {
      setAiCreating(false);
    }
  };

  // --- SEO ---
  const openSeoDialog = async (storeId: string) => {
    setSeoStoreId(storeId);
    const { data } = await cloud
      .from("home_seo")
      .select("meta_title, meta_description, og_image_path")
      .eq("key", storeId)
      .maybeSingle();
    setSeoData({
      meta_title: (data as any)?.meta_title ?? "",
      meta_description: (data as any)?.meta_description ?? "",
      og_image_path: (data as any)?.og_image_path ?? "",
    });
    setSeoOpen(true);
  };

  const handleSaveSeo = async () => {
    if (!seoStoreId) return;
    setSavingSeo(true);
    const { error } = await cloud.from("home_seo").upsert(
      {
        key: seoStoreId,
        meta_title: seoData.meta_title || null,
        meta_description: seoData.meta_description || null,
        og_image_path: seoData.og_image_path || null,
        active: true,
      },
      { onConflict: "key" }
    );
    if (error) {
      toast.error("Erro ao salvar SEO: " + error.message);
    } else {
      toast.success("SEO atualizado!");
      setSeoOpen(false);
    }
    setSavingSeo(false);
  };

  // --- Detail ---
  const openDetail = (summary: StoreSummary) => {
    setDetailStore(summary);
    setDetailOpen(true);
  };

  // --- Permissions ---
  const openPermissions = async (storeId: string) => {
    setPermStoreId(storeId);
    // Init permissions if they don't exist yet
    await cloud.rpc("init_store_permissions", { _store_id: storeId });
    const { data } = await cloud
      .from("store_permissions")
      .select("module, enabled")
      .eq("store_id", storeId);
    const map: Record<string, boolean> = {};
    (data ?? []).forEach((row: any) => {
      map[row.module] = row.enabled;
    });
    setPermModules(map);
    setPermOpen(true);
  };

  const handleSavePermissions = async () => {
    if (!permStoreId) return;
    setSavingPerm(true);
    const updates = Object.entries(permModules).map(([module, enabled]) =>
      cloud
        .from("store_permissions")
        .update({ enabled })
        .eq("store_id", permStoreId)
        .eq("module", module)
    );
    await Promise.all(updates);
    toast.success("Permissões atualizadas!");
    setPermOpen(false);
    setSavingPerm(false);
  };

  if (loading || permLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-sm text-muted-foreground animate-pulse">Carregando lojas...</div>
      </div>
    );
  }

  if (stores.length === 0 && !isMaster) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="rounded-2xl max-w-md">
          <CardContent className="p-8 text-center space-y-3">
            <Store className="w-12 h-12 mx-auto text-muted-foreground/40" />
            <h2 className="text-lg font-semibold">Sem acesso a lojas</h2>
            <p className="text-sm text-muted-foreground">
              Você não possui acesso a nenhuma loja. Entre em contato com o administrador master.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-center sm:text-left space-y-2">
          {isMaster && (
            <Badge variant="destructive" className="mb-2">
              <Crown className="w-3 h-3 mr-1" /> MASTER
            </Badge>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {isMaster ? "Painel Global" : "Selecionar Loja"}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {isMaster
              ? "Visão geral de todas as lojas do sistema. Selecione uma para gerenciar."
              : "Escolha a loja que deseja acessar."}
          </p>
        </div>
        {isMaster && (
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" onClick={() => navigate("/admin/master")} className="gap-2">
              <BarChart3 className="w-4 h-4" /> Dashboard Global
            </Button>
            <Button variant="secondary" onClick={() => setAiCreateOpen(true)} className="gap-2">
              <Sparkles className="w-4 h-4" /> Criar com IA
            </Button>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Nova Loja
            </Button>
          </div>
        )}
      </div>

      {/* Global stats */}
      {isMaster && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Store, value: stores.filter(s => s.active).length, label: "Lojas ativas" },
            { icon: ShoppingCart, value: summaries.reduce((s, x) => s + x.orderCount, 0), label: "Pedidos total" },
            { icon: Package, value: summaries.reduce((s, x) => s + x.productCount, 0), label: "Produtos ativos" },
            { icon: Users, value: storeAccess.length || "∞", label: "Acessos" },
          ].map(({ icon: Icon, value, label }) => (
            <Card key={label} className="rounded-xl">
              <CardContent className="p-4 text-center">
                <Icon className="w-5 h-5 mx-auto mb-1 text-primary" />
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Store cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stores.map((store) => {
          const summary = summaries.find((s) => s.store.id === store.id);
          const domains = summary?.domains ?? [];
          const displayDomain = getStoreDomain(store, domains);

          return (
            <Card
              key={store.id}
              className={`rounded-2xl hover:shadow-lg transition-all border-2 hover:border-primary/40 group ${!store.active ? 'opacity-60' : ''}`}
            >
              <CardContent className="p-5 sm:p-6 space-y-4">
                {/* Store header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-primary/10 p-2.5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {storeIcon(store.slug)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm sm:text-base">{store.name}</h3>
                      <p className="text-xs text-muted-foreground">/{store.slug}</p>
                    </div>
                  </div>
                  {store.favicon_path && (
                    <img src={store.favicon_path} alt="favicon" className="w-5 h-5 rounded" />
                  )}
                </div>

                {/* Domain */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Globe className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{displayDomain}</span>
                  {domains.length > 1 && (
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-1">
                      +{domains.length - 1}
                    </Badge>
                  )}
                </div>

                {/* Favicon info */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>{store.favicon_path ? "Favicon configurado" : "Sem favicon"}</span>
                </div>

                {/* Stats */}
                {isMaster && summary && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
                    <div className="text-center">
                      <div className="text-sm font-bold">{summary.orderCount}</div>
                      <div className="text-[10px] text-muted-foreground">Pedidos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold">{summary.productCount}</div>
                      <div className="text-[10px] text-muted-foreground">Produtos</div>
                    </div>
                    <div className="text-center">
                      <Badge variant={store.active ? "default" : "secondary"} className="text-[10px]">{store.active ? "Ativa" : "Inativa"}</Badge>
                      <div className="text-[10px] text-muted-foreground">Status</div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="flex-1 h-9 text-xs sm:text-sm"
                    onClick={() => enterStore(store)}
                  >
                    Acessar loja <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                  {isMaster && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 w-9 p-0"
                        title="SEO"
                        onClick={(e) => { e.stopPropagation(); openSeoDialog(store.id); }}
                      >
                        <Settings2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 w-9 p-0"
                        title="Domínios"
                        onClick={(e) => { e.stopPropagation(); summary && openDetail(summary); }}
                      >
                        <Link2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 w-9 p-0"
                        title="Permissões"
                        onClick={(e) => { e.stopPropagation(); openPermissions(store.id); }}
                      >
                        <Shield className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create Store Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Nova Loja</DialogTitle>
            <DialogDescription>Preencha os dados básicos da nova loja.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome da loja</Label>
              <Input
                value={newStoreName}
                onChange={(e) => {
                  setNewStoreName(e.target.value);
                  if (!newStoreSlug || newStoreSlug === newStoreName.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                    setNewStoreSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
                }}
                placeholder="Minha Loja"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug (URL)</Label>
              <Input
                value={newStoreSlug}
                onChange={(e) => setNewStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="minha-loja"
              />
            </div>
            <div className="space-y-2">
              <Label>Domínio (opcional)</Label>
              <Input
                value={newStoreDomain}
                onChange={(e) => setNewStoreDomain(e.target.value)}
                placeholder="www.minhaloja.com.br"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateStore} disabled={creating}>
              {creating ? "Criando..." : "Criar Loja"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SEO Dialog */}
      <Dialog open={seoOpen} onOpenChange={setSeoOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Configurações de SEO</DialogTitle>
            <DialogDescription>Edite título, descrição e imagem OG da loja.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Meta Title <span className="text-xs text-muted-foreground">({seoData.meta_title.length}/60)</span></Label>
              <Input
                value={seoData.meta_title}
                onChange={(e) => setSeoData({ ...seoData, meta_title: e.target.value })}
                placeholder="Título da página"
                maxLength={60}
              />
            </div>
            <div className="space-y-2">
              <Label>Meta Description <span className="text-xs text-muted-foreground">({seoData.meta_description.length}/160)</span></Label>
              <Input
                value={seoData.meta_description}
                onChange={(e) => setSeoData({ ...seoData, meta_description: e.target.value })}
                placeholder="Descrição para mecanismos de busca"
                maxLength={160}
              />
            </div>
            <div className="space-y-2">
              <Label>OG Image URL</Label>
              <Input
                value={seoData.og_image_path}
                onChange={(e) => setSeoData({ ...seoData, og_image_path: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSeoOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveSeo} disabled={savingSeo}>
              {savingSeo ? "Salvando..." : "Salvar SEO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Store Detail / Domains Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Domínios — {detailStore?.store.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Main domain from stores table */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Domínio principal (stores)</Label>
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm">
                <Globe className="w-4 h-4 text-primary shrink-0" />
                <span className="truncate">{detailStore?.store.domain || "Não configurado"}</span>
              </div>
            </div>

            <Separator />

            {/* Favicon */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Favicon</Label>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                {detailStore?.store.favicon_path ? (
                  <>
                    <img src={detailStore.store.favicon_path} alt="Favicon" className="w-8 h-8 rounded border" />
                    <span className="text-xs truncate">{detailStore.store.favicon_path}</span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">Nenhum favicon configurado</span>
                )}
              </div>
            </div>

            <Separator />

            {/* Domains list */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Domínios vinculados</Label>
              {detailStore?.domains && detailStore.domains.length > 0 ? (
                <div className="space-y-2">
                  {detailStore.domains.map((d) => (
                    <div key={d.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm">
                        <Link2 className="w-4 h-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{d.domain}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {d.is_primary && <Badge variant="default" className="text-[10px] h-5">Primário</Badge>}
                        <Badge variant={d.verified ? "default" : "secondary"} className="text-[10px] h-5">
                          {d.verified ? "Verificado" : "Pendente"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhum domínio vinculado.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={permOpen} onOpenChange={setPermOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Permissões de Módulos
            </DialogTitle>
            <DialogDescription>
              Ative ou desative módulos disponíveis para esta loja.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[50vh] overflow-y-auto">
            {ALL_MODULES.map((mod) => (
              <div
                key={mod}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors"
              >
                <span className="text-sm font-medium">{MODULE_LABELS[mod]}</span>
                <Button
                  size="sm"
                  variant={permModules[mod] ? "default" : "outline"}
                  className="h-7 text-xs min-w-[70px]"
                  onClick={() =>
                    setPermModules((prev) => ({ ...prev, [mod]: !prev[mod] }))
                  }
                >
                  {permModules[mod] ? "Ativo" : "Inativo"}
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePermissions} disabled={savingPerm}>
              {savingPerm ? "Salvando..." : "Salvar Permissões"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
