import { useEffect, useState, useMemo } from "react";
import { cloud } from "@/lib/cloud";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Flame,
  Snowflake,
  ThermometerSun,
  Eye,
  MousePointerClick,
  Clock,
  Search,
  Users,
  ChevronRight,
  Monitor,
  Smartphone,
  BarChart3,
  Activity,
  ShoppingCart,
  MessageCircle,
  TrendingUp,
  Globe,
  RefreshCw,
  ArrowUpRight,
  Layers,
  Target,
} from "lucide-react";

/* ---------- types ---------- */
type Session = {
  id: string;
  session_id: string;
  device: string;
  source: string;
  score: number;
  temperature: string;
  status: string;
  total_pages: number;
  total_clicks: number;
  total_time_seconds: number;
  scroll_depth: number;
  first_seen_at: string;
  last_seen_at: string;
  user_id: string | null;
};

type UserEvent = {
  id: string;
  type: string;
  session_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

/* ---------- helpers ---------- */
function tempBadge(t: string, size: "sm" | "md" = "sm") {
  const cls = size === "md" ? "px-3 py-1 text-sm" : "";
  if (t === "quente")
    return (
      <Badge className={`bg-red-500/10 text-red-600 border-red-200 gap-1.5 ${cls}`}>
        <Flame className={size === "md" ? "h-4 w-4" : "h-3 w-3"} /> Quente
      </Badge>
    );
  if (t === "morno")
    return (
      <Badge className={`bg-amber-500/10 text-amber-600 border-amber-200 gap-1.5 ${cls}`}>
        <ThermometerSun className={size === "md" ? "h-4 w-4" : "h-3 w-3"} /> Morno
      </Badge>
    );
  return (
    <Badge className={`bg-blue-500/10 text-blue-600 border-blue-200 gap-1.5 ${cls}`}>
      <Snowflake className={size === "md" ? "h-4 w-4" : "h-3 w-3"} /> Frio
    </Badge>
  );
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtDuration(sec: number) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function isMobileDevice(ua: string) {
  return /mobile|android|iphone|ipad/i.test(ua);
}

function eventLabel(type: string) {
  const map: Record<string, string> = {
    page_view: "Visualização de Página",
    product_view: "Visualização de Produto",
    search: "Pesquisa",
    add_to_cart: "Adicionou ao Carrinho",
    banner_click: "Clique em Banner",
    checkout_start: "Iniciou Checkout",
    request_quote: "Solicitou Orçamento",
    scroll: "Scroll na Página",
    chat_open: "Abriu Chat",
    chat_close: "Fechou Chat",
    chat_message_sent: "Mensagem no Chat",
    whatsapp_click: "Clique WhatsApp",
    category_click: "Clique Categoria",
  };
  return map[type] ?? type;
}

function eventIcon(type: string) {
  if (type === "page_view") return <Eye className="h-3.5 w-3.5 text-muted-foreground" />;
  if (type === "product_view") return <Eye className="h-3.5 w-3.5 text-primary" />;
  if (type === "add_to_cart") return <ShoppingCart className="h-3.5 w-3.5 text-green-500" />;
  if (type === "checkout_start") return <ShoppingCart className="h-3.5 w-3.5 text-amber-500" />;
  if (type === "search") return <Search className="h-3.5 w-3.5 text-blue-500" />;
  if (type === "chat_open" || type === "chat_message_sent") return <MessageCircle className="h-3.5 w-3.5 text-purple-500" />;
  if (type === "whatsapp_click") return <MessageCircle className="h-3.5 w-3.5 text-green-600" />;
  if (type === "scroll") return <Layers className="h-3.5 w-3.5 text-cyan-500" />;
  if (type === "request_quote") return <Target className="h-3.5 w-3.5 text-red-500" />;
  return <Activity className="h-3.5 w-3.5 text-muted-foreground" />;
}

function eventColor(type: string) {
  if (type === "product_view") return "border-l-primary";
  if (type === "add_to_cart") return "border-l-green-500";
  if (type === "checkout_start" || type === "request_quote") return "border-l-red-500";
  if (type === "search") return "border-l-blue-500";
  if (type === "whatsapp_click") return "border-l-green-600";
  if (type === "chat_open" || type === "chat_message_sent") return "border-l-purple-500";
  return "border-l-muted";
}

function funnelStage(events: UserEvent[]) {
  const types = new Set(events.map((e) => e.type));
  if (types.has("request_quote") || types.has("checkout_start")) return { label: "Conversão", color: "text-green-600", bgColor: "bg-green-500", pct: 100, step: 4 };
  if (types.has("add_to_cart")) return { label: "Interesse", color: "text-amber-600", bgColor: "bg-amber-500", pct: 66, step: 3 };
  if (types.has("product_view")) return { label: "Consideração", color: "text-blue-600", bgColor: "bg-blue-500", pct: 33, step: 2 };
  return { label: "Descoberta", color: "text-muted-foreground", bgColor: "bg-muted-foreground", pct: 10, step: 1 };
}

function scoreColor(score: number) {
  if (score >= 71) return "text-red-600";
  if (score >= 31) return "text-amber-600";
  return "text-blue-600";
}

/* ---------- main ---------- */
export default function AdminCustomers() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selected, setSelected] = useState<Session | null>(null);
  const [events, setEvents] = useState<UserEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [tempFilter, setTempFilter] = useState<string>("todos");

  const loadSessions = async () => {
    setLoading(true);
    const { data } = await cloud
      .from("user_sessions")
      .select("*")
      .order("last_seen_at", { ascending: false })
      .limit(500);
    setSessions((data ?? []) as any);
    setLoading(false);
  };

  const loadEvents = async (sessionId: string) => {
    setEventsLoading(true);
    const { data } = await cloud
      .from("user_events")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(500);
    setEvents((data ?? []) as any);
    setEventsLoading(false);
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const openSession = (s: Session) => {
    setSelected(s);
    loadEvents(s.session_id);
  };

  const filtered = useMemo(() => {
    let list = sessions;
    if (tempFilter !== "todos") list = list.filter((s) => (s.temperature || s.status) === tempFilter);
    if (filter.trim()) {
      const q = filter.toLowerCase();
      list = list.filter(
        (s) =>
          s.session_id?.toLowerCase().includes(q) ||
          s.device?.toLowerCase().includes(q) ||
          s.source?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [sessions, tempFilter, filter]);

  const stats = useMemo(() => {
    const total = sessions.length;
    const quentes = sessions.filter((s) => (s.temperature || s.status) === "quente").length;
    const mornos = sessions.filter((s) => (s.temperature || s.status) === "morno").length;
    const frios = sessions.filter((s) => (s.temperature || s.status) === "frio").length;
    const avgScore = total ? Math.round(sessions.reduce((sum, s) => sum + (s.score || 0), 0) / total) : 0;
    const avgPages = total ? Math.round(sessions.reduce((sum, s) => sum + (s.total_pages || 0), 0) / total) : 0;
    const avgTime = total ? Math.round(sessions.reduce((sum, s) => sum + (s.total_time_seconds || 0), 0) / total) : 0;
    return { total, quentes, mornos, frios, avgScore, avgPages, avgTime };
  }, [sessions]);

  /* ------ detail view ------ */
  if (selected) {
    const temp = selected.temperature || selected.status || "frio";
    const funnel = funnelStage(events);
    const eventSummary = events.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="gap-1.5 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Voltar à lista
        </Button>

        {/* Header */}
        <div className="rounded-2xl border bg-card p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              {isMobileDevice(selected.device) ? <Smartphone className="h-7 w-7 text-primary" /> : <Monitor className="h-7 w-7 text-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold tracking-tight flex items-center gap-2 flex-wrap">
                Visitante #{selected.session_id?.slice(0, 8)}
                {tempBadge(temp, "md")}
              </h1>
              <p className="text-xs text-muted-foreground mt-1 break-all font-mono">
                ID: {selected.session_id}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> {selected.source || "Direta"}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Primeiro acesso: {fmtDate(selected.first_seen_at)}</span>
                <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> Último: {fmtDate(selected.last_seen_at)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { icon: <BarChart3 className="h-4 w-4" />, label: "Score", value: selected.score, colorClass: scoreColor(selected.score) },
            { icon: <Eye className="h-4 w-4" />, label: "Páginas", value: selected.total_pages, colorClass: "" },
            { icon: <MousePointerClick className="h-4 w-4" />, label: "Cliques", value: selected.total_clicks, colorClass: "" },
            { icon: <Clock className="h-4 w-4" />, label: "Tempo", value: fmtDuration(selected.total_time_seconds), colorClass: "" },
            { icon: <Layers className="h-4 w-4" />, label: "Scroll", value: `${Math.round(selected.scroll_depth || 0)}%`, colorClass: "" },
          ].map((kpi, i) => (
            <Card key={i} className="rounded-2xl border-none shadow-sm bg-muted/40">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">{kpi.icon} {kpi.label}</div>
                <div className={`text-2xl font-bold ${kpi.colorClass}`}>{kpi.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Funnel */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Funil de Conversão</CardTitle>
          </CardHeader>
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
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`${funnel.color} font-semibold`}>Estágio atual: {funnel.label}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Info + Summary side by side */}
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
                  {Object.entries(eventSummary)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => (
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

        {/* Timeline */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Timeline de Atividade
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
                  <div
                    key={ev.id}
                    className={`rounded-lg border-l-[3px] ${eventColor(ev.type)} bg-muted/30 px-3 py-2.5 flex items-start gap-3 hover:bg-muted/50 transition-colors`}
                  >
                    <div className="mt-0.5 flex-shrink-0">{eventIcon(ev.type)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{eventLabel(ev.type)}</span>
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
          <p className="text-sm text-muted-foreground">Visitantes rastreados automaticamente via cookies — ativação automática em 5s</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadSessions} disabled={loading} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { key: "todos", icon: <Users className="h-4 w-4" />, label: "Total", value: stats.total, color: "", ring: "ring-primary/30" },
          { key: "quente", icon: <Flame className="h-4 w-4" />, label: "Quentes", value: stats.quentes, color: "text-red-600", ring: "ring-red-300" },
          { key: "morno", icon: <ThermometerSun className="h-4 w-4" />, label: "Mornos", value: stats.mornos, color: "text-amber-600", ring: "ring-amber-300" },
          { key: "frio", icon: <Snowflake className="h-4 w-4" />, label: "Frios", value: stats.frios, color: "text-blue-600", ring: "ring-blue-300" },
        ].map((card) => (
          <Card
            key={card.key}
            onClick={() => setTempFilter(card.key)}
            className={`rounded-2xl cursor-pointer transition-all hover:shadow-md ${tempFilter === card.key ? `ring-2 ${card.ring}` : ""}`}
          >
            <CardContent className="pt-4 pb-3 px-4">
              <div className={`text-xs flex items-center gap-1.5 mb-1 ${card.color || "text-muted-foreground"}`}>{card.icon} {card.label}</div>
              <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Avg metrics bar */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground rounded-xl border bg-muted/30 px-4 py-3">
        <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Score médio: <strong className="text-foreground">{stats.avgScore}</strong></span>
        <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> Páginas/sessão: <strong className="text-foreground">{stats.avgPages}</strong></span>
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Tempo médio: <strong className="text-foreground">{fmtDuration(stats.avgTime)}</strong></span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por token, dispositivo ou origem..." value={filter} onChange={(e) => setFilter(e.target.value)} className="pl-9 rounded-xl" />
      </div>

      {/* List */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Visitantes ({filtered.length})</span>
            {tempFilter !== "todos" && (
              <Button variant="ghost" size="sm" onClick={() => setTempFilter("todos")} className="text-xs h-7">Limpar filtro</Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {loading ? (
            <div className="text-muted-foreground py-12 text-center">Carregando visitantes...</div>
          ) : filtered.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center">Nenhum visitante encontrado.</div>
          ) : (
            filtered.map((s) => {
              const temp = s.temperature || s.status || "frio";
              return (
                <div
                  key={s.id}
                  onClick={() => openSession(s)}
                  className="rounded-xl border bg-card hover:bg-accent/20 p-3 sm:p-4 flex items-center gap-3 cursor-pointer transition-all group"
                >
                  <div className="h-10 w-10 rounded-xl bg-muted/60 flex items-center justify-center flex-shrink-0">
                    {isMobileDevice(s.device) ? <Smartphone className="h-5 w-5 text-muted-foreground" /> : <Monitor className="h-5 w-5 text-muted-foreground" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm font-mono">#{s.session_id?.slice(0, 8)}</span>
                      {tempBadge(temp)}
                      <Badge variant="outline" className={`text-[10px] font-mono ${scoreColor(s.score)}`}>Score {s.score}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                      <span>{s.total_pages} pág.</span>
                      <span>{s.total_clicks} cliques</span>
                      <span>{fmtDuration(s.total_time_seconds)}</span>
                      <span>{fmtDate(s.last_seen_at)}</span>
                    </div>
                    {/* Mini score bar */}
                    <div className="mt-1.5 max-w-[120px]">
                      <Progress value={Math.min(100, s.score)} className="h-1" />
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
