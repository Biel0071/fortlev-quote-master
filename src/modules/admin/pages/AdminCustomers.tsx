import { useEffect, useState, useMemo } from "react";
import { cloud } from "@/lib/cloud";
import { useStore } from "@/contexts/StoreContext";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, Flame, Snowflake, ThermometerSun, Eye, MousePointerClick, Clock,
  Search, Users, Monitor, Smartphone, BarChart3, Activity, ShoppingCart,
  MessageCircle, TrendingUp, Globe, RefreshCw, ArrowUpRight, Layers, Target,
  Link2, ShieldCheck, CheckCircle2,
} from "lucide-react";
import { computeLeadPropensity, leadQualityLabel } from "@/modules/tracking/scoreEngine";

/* ---------- types ---------- */
type Session = {
  id: string;
  session_token: string;
  device: string;
  source: string;
  score: number;
  temperature: string;
  channel: string;
  total_pages: number;
  total_clicks: number;
  total_time_seconds: number;
  site_time_seconds: number;
  app_time_seconds: number;
  encrypted_clicks: number;
  product_views: number;
  cart_actions: number;
  return_visits: number;
  is_bot: boolean;
  ip_hash: string | null;
  ip_masked: string | null;
  purchase_probability: number;
  lead_quality: string;
  scroll_depth: number;
  first_seen_at: string;
  last_seen_at: string;
};

type TrackingEvent = {
  id: string;
  type: string;
  session_id: string;
  path: string | null;
  product_id: string | null;
  category_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

/* ---------- helpers ---------- */
function tempBadge(t: string, size: "sm" | "md" = "sm") {
  const cls = size === "md" ? "px-3 py-1 text-sm" : "";
  const iconCls = size === "md" ? "h-4 w-4" : "h-3 w-3";
  if (t === "pronto_compra") return <Badge className={`bg-emerald-500/15 text-emerald-700 border-emerald-300 gap-1.5 ${cls}`}><CheckCircle2 className={iconCls} /> Pronto p/ Compra</Badge>;
  if (t === "quente") return <Badge className={`bg-red-500/10 text-red-600 border-red-200 gap-1.5 ${cls}`}><Flame className={iconCls} /> Quente</Badge>;
  if (t === "morno") return <Badge className={`bg-amber-500/10 text-amber-600 border-amber-200 gap-1.5 ${cls}`}><ThermometerSun className={iconCls} /> Morno</Badge>;
  if (t === "bot") return <Badge className={`bg-slate-500/10 text-slate-600 border-slate-300 gap-1.5 ${cls}`}><ShieldCheck className={iconCls} /> Bot Filtrado</Badge>;
  return <Badge className={`bg-blue-500/10 text-blue-600 border-blue-200 gap-1.5 ${cls}`}><Snowflake className={iconCls} /> Frio</Badge>;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtDuration(sec: number) {
  if (!sec || sec < 0) return "0s";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function isMobileDevice(ua: string) {
  return /mobile|android|iphone|ipad/i.test(ua || "");
}

function eventLabel(type: string) {
  const map: Record<string, string> = {
    page_view: "Visualização de Página", product_view: "Visualização de Produto", search: "Pesquisa",
    add_to_cart: "Adicionou ao Carrinho", add_cart: "Adicionou ao Carrinho", banner_click: "Clique em Banner",
    checkout_start: "Iniciou Checkout", request_quote: "Solicitou Orçamento", scroll: "Scroll na Página",
    chat_open: "Abriu Chat", chat_close: "Fechou Chat", chat_message_sent: "Mensagem no Chat",
    whatsapp_click: "Clique WhatsApp", category_click: "Clique Categoria",
    link_click: "Link Criptografado (/r/)", dwell_heartbeat: "Tempo Ativo (+10s)",
    download_apk: "Instalar App / Google Play", app_banner_click: "Banner App 10% OFF", app_install: "App Instalado",
  };
  return map[type] ?? type;
}

function eventIcon(type: string) {
  if (type === "page_view") return <Eye className="h-3.5 w-3.5 text-muted-foreground" />;
  if (type === "product_view") return <Eye className="h-3.5 w-3.5 text-primary" />;
  if (type === "add_to_cart" || type === "add_cart") return <ShoppingCart className="h-3.5 w-3.5 text-green-500" />;
  if (type === "checkout_start") return <ShoppingCart className="h-3.5 w-3.5 text-amber-500" />;
  if (type === "search") return <Search className="h-3.5 w-3.5 text-blue-500" />;
  if (type === "chat_open" || type === "chat_message_sent") return <MessageCircle className="h-3.5 w-3.5 text-purple-500" />;
  if (type === "whatsapp_click") return <MessageCircle className="h-3.5 w-3.5 text-green-600" />;
  if (type === "link_click") return <Link2 className="h-3.5 w-3.5 text-sky-600" />;
  if (type === "dwell_heartbeat") return <Clock className="h-3.5 w-3.5 text-emerald-600" />;
  if (type === "download_apk" || type === "app_install") return <Smartphone className="h-3.5 w-3.5 text-emerald-700" />;
  if (type === "scroll") return <Layers className="h-3.5 w-3.5 text-cyan-500" />;
  if (type === "request_quote") return <Target className="h-3.5 w-3.5 text-red-500" />;
  return <Activity className="h-3.5 w-3.5 text-muted-foreground" />;
}

function eventColor(type: string) {
  if (type === "product_view") return "border-l-primary";
  if (type === "add_to_cart" || type === "add_cart") return "border-l-green-500";
  if (type === "checkout_start" || type === "request_quote") return "border-l-red-500";
  if (type === "search") return "border-l-blue-500";
  if (type === "whatsapp_click") return "border-l-green-600";
  if (type === "chat_open" || type === "chat_message_sent") return "border-l-purple-500";
  return "border-l-muted";
}

function funnelStage(events: TrackingEvent[]) {
  const types = new Set(events.map((e) => e.type));
  if (types.has("request_quote") || types.has("checkout_start")) return { label: "Conversão", color: "text-green-600", bgColor: "bg-green-500", pct: 100, step: 4 };
  if (types.has("add_to_cart") || types.has("add_cart")) return { label: "Interesse", color: "text-amber-600", bgColor: "bg-amber-500", pct: 66, step: 3 };
  if (types.has("product_view")) return { label: "Consideração", color: "text-blue-600", bgColor: "bg-blue-500", pct: 33, step: 2 };
  return { label: "Descoberta", color: "text-muted-foreground", bgColor: "bg-muted-foreground", pct: 10, step: 1 };
}

function scoreColor(score: number) {
  if (score >= 71) return "text-red-600";
  if (score >= 31) return "text-amber-600";
  return "text-blue-600";
}

function getTemp(s: Session) {
  if (s.is_bot || s.lead_quality === "bot") return "bot";
  const prob = s.purchase_probability || 0;
  if (s.lead_quality === "pronto_compra" || prob >= 85) return "pronto_compra";
  if (s.lead_quality === "quente" || s.temperature === "quente" || prob >= 65) return "quente";
  if (s.lead_quality === "morno" || s.temperature === "morno" || prob >= 35) return "morno";
  return "frio";
}

function channelLabel(ch: string | undefined) {
  if (ch === "site+app") return "Site + App";
  if (ch === "app") return "App";
  return "Site";
}

/* ---------- main ---------- */
export default function AdminCustomers() {
  const { activeStoreId } = useStore();
  const [loading, setLoading] = useState(true);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [selected, setSelected] = useState<Session | null>(null);
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [tempFilter, setTempFilter] = useState<string>("todos");

  const loadSessions = async () => {
    if (!activeStoreId) return;
    setLoading(true);
    const { data } = await cloud
      .from("tracking_sessions")
      .select("*")
      .or(`store_id.eq.${activeStoreId},store_id.is.null`)
      .order("last_seen_at", { ascending: false })
      .limit(500);

    setSessions((data ?? []).map((d: Record<string, unknown>) => {
      const siteTime = Number(d.site_time_seconds ?? d.total_time_seconds ?? 0);
      const appTime = Number(d.app_time_seconds ?? 0);
      const calc = computeLeadPropensity({
        siteTimeSeconds: siteTime,
        appTimeSeconds: appTime,
        totalPages: Number(d.total_pages || 0),
        encryptedClicks: Number(d.encrypted_clicks || 0),
        scrollDepth: Number(d.scroll_depth || 0),
        productViews: Number(d.product_views || 0),
        cartActions: Number(d.cart_actions || 0),
        returnVisits: Number(d.return_visits || 1),
        isBot: Boolean(d.is_bot),
      });
      const serverProb = d.purchase_probability != null ? Number(d.purchase_probability) : 0;
      const probability = d.is_bot ? 0 : Math.max(serverProb, calc.probability);
      return {
        id: String(d.id || ""),
        session_token: String(d.session_token || ""),
        device: String(d.device || ""),
        source: String(d.source || ""),
        score: Number(d.score || 0),
        temperature: String(d.temperature || calc.temperature),
        channel: String(d.channel || (appTime > 0 && siteTime > 0 ? "site+app" : appTime > 0 ? "app" : "site")),
        total_pages: Number(d.total_pages || 0),
        total_clicks: Number(d.total_clicks || 0),
        total_time_seconds: Number(d.total_time_seconds || 0),
        site_time_seconds: siteTime,
        app_time_seconds: appTime,
        encrypted_clicks: Number(d.encrypted_clicks || 0),
        product_views: Number(d.product_views || 0),
        cart_actions: Number(d.cart_actions || 0),
        return_visits: Number(d.return_visits || 1),
        is_bot: Boolean(d.is_bot),
        ip_hash: typeof d.ip_hash === "string" ? d.ip_hash : null,
        ip_masked: typeof d.ip_masked === "string" ? d.ip_masked : null,
        purchase_probability: probability,
        lead_quality: d.is_bot ? "bot" : (typeof d.lead_quality === "string" && d.lead_quality !== "frio" ? d.lead_quality : calc.leadQuality),
        scroll_depth: Number(d.scroll_depth || 0),
        first_seen_at: String(d.first_seen_at || ""),
        last_seen_at: String(d.last_seen_at || ""),
      };
    }));
    setLoading(false);
  };

  const loadEvents = async (sessionId: string) => {
    setEventsLoading(true);
    const { data } = await cloud
      .from("tracking_events")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(500);
    setEvents((data ?? []).map((d: any) => ({
      id: d.id,
      type: d.type || "",
      session_id: d.session_id,
      path: d.path || null,
      product_id: d.product_id || null,
      category_id: d.category_id || null,
      metadata: d.metadata || {},
      created_at: d.created_at,
    })));
    setEventsLoading(false);
  };

  useEffect(() => { loadSessions(); }, [activeStoreId]);

  const openSession = (s: Session) => {
    setSelected(s);
    loadEvents(s.id);
  };

  const filtered = useMemo(() => {
    let list = sessions;
    if (tempFilter !== "todos") list = list.filter((s) => getTemp(s) === tempFilter);
    if (filter.trim()) {
      const q = filter.toLowerCase();
      list = list.filter((s) =>
        s.session_token?.toLowerCase().includes(q) ||
        s.device?.toLowerCase().includes(q) ||
        s.source?.toLowerCase().includes(q) ||
        s.ip_masked?.toLowerCase().includes(q) ||
        s.ip_hash?.toLowerCase().includes(q) ||
        s.channel?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [sessions, tempFilter, filter]);

  const stats = useMemo(() => {
    const human = sessions.filter((s) => !s.is_bot);
    const total = human.length;
    const prontos = human.filter((s) => getTemp(s) === "pronto_compra").length;
    const quentes = human.filter((s) => getTemp(s) === "quente").length;
    const mornos = human.filter((s) => getTemp(s) === "morno").length;
    const frios = human.filter((s) => getTemp(s) === "frio").length;
    const bots = sessions.filter((s) => Boolean(s.is_bot)).length;
    const avgScore = total ? Math.round(human.reduce((sum, s) => sum + (s.purchase_probability || 0), 0) / total) : 0;
    const avgPages = total ? Math.round(human.reduce((sum, s) => sum + (s.total_pages || 0), 0) / total) : 0;
    const avgTime = total ? Math.round(human.reduce((sum, s) => sum + (s.total_time_seconds || 0), 0) / total) : 0;
    return { total, prontos, quentes, mornos, frios, bots, avgScore, avgPages, avgTime };
  }, [sessions]);

  /* ------ detail view ------ */
  if (selected) {
    const temp = getTemp(selected);
    const funnel = funnelStage(events);
    const eventSummary = events.reduce((acc, e) => { acc[e.type] = (acc[e.type] || 0) + 1; return acc; }, {} as Record<string, number>);
    const breakdown = computeLeadPropensity({
      siteTimeSeconds: selected.site_time_seconds,
      appTimeSeconds: selected.app_time_seconds,
      totalPages: selected.total_pages,
      encryptedClicks: selected.encrypted_clicks,
      scrollDepth: selected.scroll_depth,
      productViews: selected.product_views,
      cartActions: selected.cart_actions,
      returnVisits: selected.return_visits,
      isBot: selected.is_bot,
    });

    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="gap-1.5 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Voltar à lista
        </Button>

        <div className="rounded-2xl border bg-card p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              {isMobileDevice(selected.device) ? <Smartphone className="h-7 w-7 text-primary" /> : <Monitor className="h-7 w-7 text-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold tracking-tight flex items-center gap-2 flex-wrap">
                Visitante #{selected.session_token?.slice(0, 8)}
                {tempBadge(temp, "md")}
                <Badge variant="outline" className="text-xs">{channelLabel(selected.channel)}</Badge>
                <Badge className="bg-emerald-600/10 text-emerald-700 border-emerald-200 text-xs">
                  Propensão {selected.purchase_probability}%
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground mt-1 break-all font-mono">
                ID: {selected.session_token}
                {selected.ip_masked ? ` · IP: ${selected.ip_masked}` : ""}
                {selected.ip_hash ? ` · Hash: ${selected.ip_hash.slice(0, 12)}` : ""}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> {selected.source || "Direta"}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Primeiro: {fmtDate(selected.first_seen_at)}</span>
                <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> Último: {fmtDate(selected.last_seen_at)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          {[
            { icon: <TrendingUp className="h-4 w-4" />, label: "Propensão", value: `${selected.purchase_probability}%`, colorClass: scoreColor(selected.purchase_probability) },
            { icon: <Clock className="h-4 w-4" />, label: "Tempo Site", value: fmtDuration(selected.site_time_seconds), colorClass: "" },
            { icon: <Smartphone className="h-4 w-4" />, label: "Tempo App", value: fmtDuration(selected.app_time_seconds), colorClass: "text-emerald-600" },
            { icon: <Link2 className="h-4 w-4" />, label: "Links Cript.", value: selected.encrypted_clicks, colorClass: "text-sky-600" },
            { icon: <Eye className="h-4 w-4" />, label: "Páginas", value: selected.total_pages, colorClass: "" },
            { icon: <Users className="h-4 w-4" />, label: "Visitas IP", value: selected.return_visits, colorClass: "" },
          ].map((kpi, i) => (
            <Card key={i} className="rounded-2xl border-none shadow-sm bg-muted/40">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">{kpi.icon} {kpi.label}</div>
                <div className={`text-xl font-bold ${kpi.colorClass}`}>{kpi.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="rounded-2xl border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Análise Algorítmica de Propensão de Compra</span>
              <Badge variant="outline">{leadQualityLabel(temp)} ({selected.purchase_probability}%)</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl border p-3"><div className="text-muted-foreground">Tempo Ativo (Site + App)</div><div className="text-base font-bold mt-1">+{breakdown.dwellPoints} pts</div></div>
            <div className="rounded-xl border p-3"><div className="text-muted-foreground">Navegação & Links Cript.</div><div className="text-base font-bold mt-1">+{breakdown.navigationPoints} pts</div></div>
            <div className="rounded-xl border p-3"><div className="text-muted-foreground">Intenção (Prod./Carrinho)</div><div className="text-base font-bold mt-1">+{breakdown.intentPoints} pts</div></div>
            <div className="rounded-xl border p-3"><div className="text-muted-foreground">Recorrência por IP</div><div className="text-base font-bold mt-1">+{breakdown.returnPoints} pts</div></div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Funil de Conversão</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-stretch gap-1.5 mb-3">
              {["Descoberta", "Consideração", "Interesse", "Conversão"].map((step, i) => {
                const active = i < funnel.step;
                return (
                  <div key={step} className="flex-1 text-center">
                    <div className={`h-2.5 rounded-full transition-all ${active ? funnel.bgColor : "bg-muted"}`} />
                    <span className={`text-[10px] mt-1 block ${active ? funnel.color + " font-semibold" : "text-muted-foreground"}`}>{step}</span>
                  </div>
                );
              })}
            </div>
            <Badge variant="outline" className={`${funnel.color} font-semibold`}>Estágio atual: {funnel.label}</Badge>
          </CardContent>
        </Card>

        <div className="grid sm:grid-cols-2 gap-4">
          <Card className="rounded-2xl">
            <CardHeader className="pb-2"><CardTitle className="text-base">Detalhes da Sessão</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Dispositivo", value: isMobileDevice(selected.device) ? "📱 Mobile" : "🖥️ Desktop" },
                { label: "Origem", value: selected.source || "Direta" },
                { label: "Primeiro acesso", value: fmtDate(selected.first_seen_at) },
                { label: "Última atividade", value: fmtDate(selected.last_seen_at) },
                { label: "Scroll máximo", value: `${Math.round(selected.scroll_depth || 0)}%` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-right">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="pb-2"><CardTitle className="text-base">Resumo de Eventos</CardTitle></CardHeader>
            <CardContent>
              {eventsLoading ? (
                <p className="text-muted-foreground text-sm py-4 text-center">Carregando...</p>
              ) : events.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">Nenhum evento registrado.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(eventSummary).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between py-1">
                      <span className="flex items-center gap-2 text-sm">{eventIcon(type)} {eventLabel(type)}</span>
                      <Badge variant="secondary" className="text-xs font-mono">{count}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Timeline
              {!eventsLoading && <Badge variant="secondary" className="text-[10px] ml-auto">{events.length} eventos</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="text-muted-foreground text-sm py-8 text-center">Carregando timeline...</div>
            ) : events.length === 0 ? (
              <div className="text-muted-foreground text-sm py-8 text-center">Nenhum evento registrado.</div>
            ) : (
              <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                {events.map((ev) => (
                  <div key={ev.id} className={`rounded-lg border-l-[3px] ${eventColor(ev.type)} bg-muted/30 px-3 py-2.5 flex items-start gap-3 hover:bg-muted/50 transition-colors`}>
                    <div className="mt-0.5 flex-shrink-0">{eventIcon(ev.type)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{eventLabel(ev.type)}</span>
                        {ev.path && <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]">{ev.path}</span>}
                        <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">{fmtDate(ev.created_at)}</span>
                      </div>
                      {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                        <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          {Object.entries(ev.metadata).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ------ list view ------ */
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Análise de Clientes</h1>
          <p className="text-sm text-muted-foreground">{stats.total} visitantes rastreados</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadSessions} disabled={loading} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { key: "todos", icon: <Users className="h-4 w-4" />, label: "Humanos", value: stats.total, color: "", ring: "ring-primary/30" },
          { key: "pronto_compra", icon: <CheckCircle2 className="h-4 w-4" />, label: "Prontos (≥85%)", value: stats.prontos, color: "text-emerald-600", ring: "ring-emerald-300" },
          { key: "quente", icon: <Flame className="h-4 w-4" />, label: "Quentes", value: stats.quentes, color: "text-red-600", ring: "ring-red-300" },
          { key: "morno", icon: <ThermometerSun className="h-4 w-4" />, label: "Mornos", value: stats.mornos, color: "text-amber-600", ring: "ring-amber-300" },
          { key: "frio", icon: <Snowflake className="h-4 w-4" />, label: "Frios", value: stats.frios, color: "text-blue-600", ring: "ring-blue-300" },
          { key: "bot", icon: <ShieldCheck className="h-4 w-4" />, label: "Bots Filtrados", value: stats.bots, color: "text-slate-600", ring: "ring-slate-300" },
        ].map((card) => (
          <Card key={card.key} onClick={() => setTempFilter(card.key)} className={`rounded-2xl cursor-pointer transition-all hover:shadow-md ${tempFilter === card.key ? `ring-2 ${card.ring}` : ""}`}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className={`text-xs flex items-center gap-1.5 mb-1 ${card.color || "text-muted-foreground"}`}>{card.icon} {card.label}</div>
              <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground rounded-xl border bg-muted/30 px-4 py-3">
        <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Propensão média: <strong className="text-foreground">{stats.avgScore}%</strong></span>
        <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> Páginas/sessão: <strong className="text-foreground">{stats.avgPages}</strong></span>
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Tempo médio: <strong className="text-foreground">{fmtDuration(stats.avgTime)}</strong></span>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por token, IP, canal (site/app), dispositivo ou origem..." value={filter} onChange={(e) => setFilter(e.target.value)} className="pl-9 rounded-xl" />
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Visitantes ({filtered.length})</span>
            {tempFilter !== "todos" && <Button variant="ghost" size="sm" onClick={() => setTempFilter("todos")} className="text-xs h-7">Limpar filtro</Button>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {loading ? (
            <div className="text-muted-foreground py-12 text-center">Carregando visitantes...</div>
          ) : filtered.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center">Nenhum visitante encontrado.</div>
          ) : (
            filtered.map((s) => {
              const temp = getTemp(s);
              return (
                <div key={s.id} onClick={() => openSession(s)} className="rounded-xl border bg-card hover:bg-accent/20 p-3 sm:p-4 flex items-center gap-3 cursor-pointer transition-all group">
                  <div className="h-10 w-10 rounded-xl bg-muted/60 flex items-center justify-center flex-shrink-0">
                    {isMobileDevice(s.device) ? <Smartphone className="h-5 w-5 text-muted-foreground" /> : <Monitor className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm font-mono">#{s.session_token?.slice(0, 8)}</span>
                      {tempBadge(temp)}
                      <Badge variant="outline" className="text-[10px]">{channelLabel(s.channel)}</Badge>
                      <Badge variant="outline" className={`text-[10px] font-mono ${scoreColor(s.purchase_probability)}`}>
                        Propensão {s.purchase_probability}%
                      </Badge>
                      {s.ip_masked ? (
                        <span className="text-[10px] font-mono text-muted-foreground">IP {s.ip_masked}</span>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                      <span>{s.total_pages} pág.</span>
                      <span>{s.encrypted_clicks} cript.</span>
                      <span>Site {fmtDuration(s.site_time_seconds)}</span>
                      <span>App {fmtDuration(s.app_time_seconds)}</span>
                      <span>{fmtDate(s.last_seen_at)}</span>
                    </div>
                    <div className="mt-1.5 max-w-[140px]">
                      <Progress value={Math.min(100, s.purchase_probability)} className="h-1" />
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
