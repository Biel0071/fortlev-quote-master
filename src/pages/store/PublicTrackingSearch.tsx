import React, { useCallback, useEffect, useRef, useState } from "react";
import { cloud } from "@/lib/cloud";
import { AppHeader } from "@/components/store/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Search,
  Package,
  Truck,
  Clock,
  Info,
  BellRing,
  ShieldCheck,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { StoreMobileChrome } from "@/components/store/mobile/StoreMobileChrome";
import { StoreFooter } from "@/components/store/StoreFooter";
import { FloatingChatButton } from "@/components/store/FloatingChatButton";
import { useConsent } from "@/hooks/store/useConsent";
import {
  TrackingCustomerCard,
  type TrackingCustomerCardProps,
  type TrackingOrderItem,
} from "@/components/store/tracking/TrackingCustomerCard";
import { useTenant } from "@/providers/TenantProvider";
import {
  formatCpfCnpj,
  resolveTrackingItemsAndTotal,
  type RawTrackingItemInput,
} from "@/utils/trackingItems";

interface TrackingMetadata {
  custom_items?: RawTrackingItemInput[];
  custom_total?: number;
  custom_progress?: number;
}

interface TrackingOrderRecord {
  id?: string;
  store_id?: string | null;
  status?: string | null;
  total?: number | null;
  customer_name?: string | null;
  customer_cpf?: string | null;
  address?: string | null;
  cep?: string | null;
  items?: TrackingOrderItem[];
}

export interface TrackingSearchResult {
  notFound?: boolean;
  id?: string;
  store_id?: string | null;
  tracking_code?: string;
  posted_at?: string | null;
  estimated_delivery_at?: string | null;
  delivered_at?: string | null;
  metadata?: TrackingMetadata | null;
  store?: { id: string; name: string; slug: string } | null;
  carrier?: TrackingCustomerCardProps["carrier"];
  status?: { id?: string; label?: string | null; progress_percentage?: number | null } | null;
  order?: TrackingOrderRecord | null;
  storeName?: string | null;
  storeAddress?: string | null;
  timeline?: NonNullable<TrackingCustomerCardProps["timeline"]>;
}

export interface PublicTrackingSearchProps {
  initialPreviewData?: TrackingSearchResult | null;
}

export default function PublicTrackingSearch({ initialPreviewData }: PublicTrackingSearchProps = {}) {
  const [searchParams] = useSearchParams();
  const { store: tenantStore } = useTenant();
  const initialQueryParam = searchParams.get("q") || "";
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState(initialQueryParam);
  const [cpf, setCpf] = useState("");
  const [result, setResult] = useState<TrackingSearchResult | null>(initialPreviewData || null);
  const [activeInfo, setActiveInfo] = useState<{ title: string; desc: string } | null>(null);
  const [simulatedTimeline, setSimulatedTimeline] = useState<
    NonNullable<TrackingCustomerCardProps["timeline"]>
  >([]);
  const { consent, saveConsent } = useConsent();
  const autoSearchedRef = useRef(false);

  useEffect(() => {
    if (initialPreviewData) {
      setResult(initialPreviewData);
    }
  }, [initialPreviewData]);

  const enrichOrderItemsAndTotal = useCallback(
    async (
      trackingObj: TrackingSearchResult,
      timelineRows: NonNullable<TrackingCustomerCardProps["timeline"]>,
      orderItems: RawTrackingItemInput[]
    ): Promise<TrackingSearchResult> => {
      const meta = trackingObj?.metadata || {};
      const { items, total } = await resolveTrackingItemsAndTotal({
        orderItems,
        customItems: meta.custom_items,
        orderTotal: trackingObj?.order?.total,
        customTotal: meta.custom_total,
        customerCpf: trackingObj?.order?.customer_cpf,
      });

      const effectiveStoreId = trackingObj?.store_id || trackingObj?.order?.store_id || null;
      let footerStoreName: string | null = null;
      let footerStoreAddress: string | null = null;

      if (effectiveStoreId) {
        try {
          const { data: footerData } = await cloud
            .from("home_footer")
            .select("store_name, address")
            .eq("store_id", effectiveStoreId)
            .eq("active", true)
            .eq("key", "main")
            .maybeSingle();
          footerStoreName = footerData?.store_name || null;
          footerStoreAddress = footerData?.address || null;
        } catch {
          // Fallback silently to store relation
        }
      }

      const storeName =
        footerStoreName ||
        trackingObj?.store?.name ||
        tenantStore?.name ||
        null;

      return {
        ...trackingObj,
        storeName,
        storeAddress: footerStoreAddress,
        timeline: timelineRows || [],
        order: {
          ...trackingObj.order,
          total,
          items,
        },
      };
    },
    [tenantStore?.name]
  );

  const performSearch = useCallback(
    async (rawCode: string, rawCpf: string) => {
      if (!rawCode && !rawCpf) return;
      setLoading(true);
      setResult(null);

      try {
        const cleanCode = rawCode.trim().toUpperCase();
        const digitsFromCode = rawCode.replace(/\D/g, "");
        const cleanCpf =
          rawCpf.replace(/\D/g, "") ||
          (digitsFromCode.length === 11 || digitsFromCode.length === 14 ? digitsFromCode : "");

        const trackingSelect = `
          id,
          store_id,
          tracking_code,
          posted_at,
          estimated_delivery_at,
          delivered_at,
          metadata,
          store:stores(id, name, slug),
          carrier:order_tracking_carriers(id, name, logo_url, website, tracking_url_template),
          status:order_tracking_status(id, label, progress_percentage),
          order:store_orders(
            id,
            store_id,
            status,
            total,
            customer_name,
            customer_cpf,
            address,
            cep
          )
        `;

        const { data: tracking, error: trackingError } = await cloud
          .from("order_tracking_main")
          .select(trackingSelect)
          .eq("tracking_code", cleanCode)
          .maybeSingle();

        if (trackingError) throw trackingError;

        const typedTracking = tracking as unknown as TrackingSearchResult | null;
        if (typedTracking) {
          const orderId = typedTracking.order?.id;
          const [{ data: timeline }, { data: items }] = await Promise.all([
            cloud
              .from("order_tracking_timeline")
              .select("*")
              .eq("tracking_id", typedTracking.id as string)
              .order("event_at", { ascending: false }),
            orderId
              ? cloud
                  .from("store_order_items")
                  .select("*")
                  .eq("order_id", orderId)
                  .order("created_at", { ascending: true })
              : Promise.resolve({ data: [] as RawTrackingItemInput[], error: null }),
          ]);

          const enriched = await enrichOrderItemsAndTotal(
            typedTracking,
            (timeline || []) as NonNullable<TrackingCustomerCardProps["timeline"]>,
            (items || []) as RawTrackingItemInput[]
          );
          setResult(enriched);
          setLoading(false);
          return;
        }

        if (cleanCpf) {
          const formattedDoc = formatCpfCnpj(cleanCpf);
          const { data: orders, error: orderError } = await cloud
            .from("store_orders")
            .select("id")
            .or(`customer_cpf.eq.${cleanCpf},customer_cpf.eq.${formattedDoc}`);

          if (orderError) throw orderError;

          if (orders && orders.length > 0) {
            const { data: cpfTracking, error: cpfError } = await cloud
              .from("order_tracking_main")
              .select(trackingSelect)
              .in("order_id", orders.map((o) => o.id))
              .order("created_at", { ascending: false })
              .limit(1);

            if (cpfError) throw cpfError;

            const found =
              cpfTracking && cpfTracking.length > 0
                ? (cpfTracking[0] as unknown as TrackingSearchResult)
                : null;
            if (found) {
              const foundOrderId = found.order?.id;
              const [{ data: timeline }, { data: items }] = await Promise.all([
                cloud
                  .from("order_tracking_timeline")
                  .select("*")
                  .eq("tracking_id", found.id as string)
                  .order("event_at", { ascending: false }),
                foundOrderId
                  ? cloud
                      .from("store_order_items")
                      .select("*")
                      .eq("order_id", foundOrderId)
                      .order("created_at", { ascending: true })
                  : Promise.resolve({ data: [] as RawTrackingItemInput[], error: null }),
              ]);

              const enriched = await enrichOrderItemsAndTotal(
                found,
                (timeline || []) as NonNullable<TrackingCustomerCardProps["timeline"]>,
                (items || []) as RawTrackingItemInput[]
              );
              setResult(enriched);
              setLoading(false);
              return;
            }
          }
        }

        setResult({ notFound: true });
        toast({
          title: "Não encontrado",
          description: "Nenhum pedido encontrado para os dados informados.",
          variant: "destructive",
        });
      } catch (error: unknown) {
        console.error("DEBUG: Error in handleSearch:", error);
        toast({
          title: "Erro na consulta",
          description: "Ocorreu um erro ao buscar seu rastreio.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [enrichOrderItemsAndTotal]
  );

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    void performSearch(code, cpf);
  };

  useEffect(() => {
    if (initialQueryParam && !initialPreviewData && !autoSearchedRef.current) {
      autoSearchedRef.current = true;
      void performSearch(initialQueryParam, "");
    }
  }, [initialQueryParam, initialPreviewData, performSearch]);

  useEffect(() => {
    if (!result || result.notFound) return;

    const sortedTimeline = [...(result.timeline || [])].sort(
      (a, b) => new Date(b.event_at).getTime() - new Date(a.event_at).getTime()
    );
    setSimulatedTimeline(sortedTimeline);
  }, [result]);

  const effectiveProgress =
    typeof result?.metadata?.custom_progress === "number"
      ? result.metadata.custom_progress
      : result?.status?.progress_percentage ?? 25;

  return (
    <div className="min-h-screen bg-background tracking-search-page flex flex-col">
      {!initialPreviewData && <AppHeader cartCount={0} />}
      {!initialPreviewData && <StoreMobileChrome cartCount={0} />}
      {!initialPreviewData && <FloatingChatButton />}

      <div className={`flex-1 flex flex-col justify-center items-center w-full px-4 ${result && !result.notFound ? "py-6 sm:py-8" : "py-8 sm:py-16 my-auto"}`}>
        <main className={`w-full mx-auto space-y-6 sm:space-y-8 ${result && !result.notFound ? "max-w-5xl" : "max-w-xl"}`}>
          <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
              <Truck className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight uppercase">
                Rastreio de Pedidos
              </h1>
              <p className="text-muted-foreground max-w-md mx-auto text-xs sm:text-base">
                Acompanhe o status, a logística e a rota de entrega do seu pedido em tempo real.
              </p>
            </div>
          </div>

          <Card className="border-2 border-primary/5 shadow-xl rounded-3xl overflow-hidden bg-card">
            <CardContent className="p-6 sm:p-8 space-y-6">
              <form onSubmit={handleSearch} className="space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="search"
                    className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-muted-foreground ml-1"
                  >
                    Código de Rastreio, Pedido ou CPF/CNPJ
                  </Label>
                  <div className="relative">
                    <Package className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      id="search"
                      value={code}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCode(val);
                        const cleanVal = val.replace(/\D/g, "");
                        if (cleanVal.length === 11 || cleanVal.length === 14) {
                          setCpf(cleanVal);
                        } else {
                          setCpf("");
                        }
                      }}
                      placeholder="Ex: RT74307932BR ou 000.000.000-00"
                      className="h-12 sm:h-14 pl-12 rounded-2xl border-2 border-slate-100 focus:border-primary transition-all font-bold text-slate-700 text-sm sm:text-base"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 sm:h-14 text-[13px] sm:text-base font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all px-2"
                  disabled={loading || !code}
                >
                  {loading ? (
                    <Clock className="animate-spin mr-2 w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <Search className="mr-2 w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                  <span className="truncate">Consultar Status de Entrega</span>
                </Button>
              </form>

              {/* Faixa de Homologação e Confiança Centralizada */}
              <div className="pt-4 border-t border-slate-100 flex flex-col items-center justify-center text-center gap-2.5">
                <span className="text-xs sm:text-sm font-bold text-slate-700 tracking-tight">
                  Entrega monitorada diretamente com a logística da loja
                </span>
                <div className="inline-flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200/90 px-4 py-1.5 rounded-full shadow-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                  <span>RASTREIO HOMOLOGADO</span>
                </div>
              </div>
            </CardContent>
          </Card>

        {result && !result.notFound ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {effectiveProgress >= 60 && !consent?.notifications && (
              <Card className="bg-slate-900 text-white rounded-3xl overflow-hidden shadow-xl border-none">
                <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-primary">
                      <BellRing className="w-6 h-6 text-white animate-bounce" />
                    </div>
                    <div>
                      <h4 className="font-black uppercase tracking-tight text-lg">
                        Ativar Alertas de Entrega?
                      </h4>
                      <p className="text-white/60 text-sm">
                        Receba notificações em tempo real sobre cada avanço da sua encomenda.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      saveConsent({ notifications: true });
                      toast({
                        title: "Notificações Ativadas",
                        description: "Você receberá atualizações sobre seu pedido.",
                      });
                    }}
                    className="bg-white text-slate-900 hover:bg-white/90 rounded-2xl h-12 px-8 font-black uppercase tracking-widest shrink-0"
                  >
                    Ativar Agora
                  </Button>
                </CardContent>
              </Card>
            )}

            <TrackingCustomerCard
              trackingCode={result.tracking_code || ""}
              orderId={result.order?.id}
              statusLabel={result.status?.label || "Coletado"}
              progress={effectiveProgress}
              estimatedDeliveryAt={result.estimated_delivery_at}
              postedAt={result.posted_at}
              deliveredAt={result.delivered_at}
              carrier={result.carrier}
              storeName={result.storeName}
              storeAddress={result.storeAddress}
              timeline={simulatedTimeline}
              items={result.order?.items || []}
              orderTotal={result.order?.total}
              customerName={result.order?.customer_name}
              address={result.order?.address}
              cep={result.order?.cep}
              onResetSearch={() => {
                setResult(null);
                setCode("");
                setCpf("");
              }}
            />
          </div>
        ) : (
          result?.notFound && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-6 animate-in fade-in zoom-in duration-300">
              <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Search className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-800 uppercase">Não encontrado</h2>
                <p className="text-muted-foreground max-w-sm">
                  Não foi encontrado rastreio para o pedido com os dados informados.
                </p>
              </div>
              <Button
                asChild
                className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-green-500/20 bg-green-600 hover:bg-green-700"
              >
                <a
                  href="https://wa.me/553175193626?text=Olá, não consegui rastrear minha entrega"
                  target="_blank"
                  rel="noreferrer"
                >
                  Falar no WhatsApp
                </a>
              </Button>
              <button
                onClick={() => {
                  setResult(null);
                  setCode("");
                  setCpf("");
                }}
                className="text-xs font-black uppercase tracking-widest text-primary hover:underline"
              >
                Tentar Novamente
              </button>
            </div>
          )
        )}

        <Dialog open={!!activeInfo} onOpenChange={(open) => !open && setActiveInfo(null)}>
          <DialogContent className="rounded-3xl max-w-[90vw] sm:max-w-md">
            <DialogHeader className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto">
                <Info className="w-6 h-6" />
              </div>
              <DialogTitle className="text-xl font-black uppercase text-center tracking-tight">
                {activeInfo?.title}
              </DialogTitle>
              <DialogDescription className="text-center text-base font-medium leading-relaxed text-slate-600">
                {activeInfo?.desc}
              </DialogDescription>
            </DialogHeader>
            <Button
              onClick={() => setActiveInfo(null)}
              className="w-full rounded-2xl h-12 font-black uppercase tracking-widest mt-4"
            >
              Entendi
            </Button>
          </DialogContent>
        </Dialog>
      </main>
      </div>
      {!initialPreviewData && <StoreFooter />}
    </div>
  );
}
