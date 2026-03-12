import { useEffect, useState, useMemo } from "react";
import { cloud } from "@/lib/cloud";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";

/* ---------- types ---------- */
type Session = {
  id: string;
  session_token: string;
  device: string;
  source: string;
  score: number;
  temperature: string;
  total_pages: number;
  total_clicks: number;
  total_time_seconds: number;
  scroll_depth: number;
  first_seen_at: string;
  last_seen_at: string;
  user_id: string | null;
};

type TrackEvent = {
  id: string;
  type: string;
  path: string | null;
  product_id: string | null;
  category_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

/* ---------- helpers ---------- */
function tempBadge(t: string) {
  if (t === "quente")
    return (
      <Badge className="bg-red-500/15 text-red-600 border-red-500/30 gap-1">
        <Flame className="h-3 w-3" /> Quente
      </Badge>
    );
  if (t === "morno")
    return (
      <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 gap-1">
        <ThermometerSun className="h-3 w-3" /> Morno
      </Badge>
    );
  return (
    <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 gap-1">
      <Snowflake className="h-3 w-3" /> Frio
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
  return `${m}m ${s}s`;
}

function isMobile(ua: string) {
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
    scroll: "Scroll",
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
  return <Activity className="h-3.5 w-3.5 text-muted-foreground" />;
}

function funnelStage(events: TrackEvent[]) {
  const types = new Set(events.map((e) => e.type));
  if (types.has("request_quote") || types.has("checkout_start")) return { label: "Conversão", color: "text-green-600", pct: 100 };
  if (types.has("add_to_cart")) return { label: "Interesse", color: "text-amber-600", pct: 66 };
  if (types.has("product_view")) return { label: "Consideração", color: "text-blue-600", pct: 33 };
  return { label: "Descoberta", color: "text-muted-foreground", pct: 10 };
}

/* ---------- main ---------- */
export default function AdminCustomers() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selected, setSelected] = useState<Session | null>(null);
  const [events, setEvents] = useState<TrackEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [tempFilter, setTempFilter] = useState<string>("todos");

  const loadSessions = async () => {
    setLoading(true);
    const { data } = await cloud
      .from("tracking_sessions")
      .select("*")
      .order("last_seen_at", { ascending: false })
      .limit(500);
    setSessions((data ?? []) as any);
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
    setEvents((data ?? []) as any);
    setEventsLoading(false);
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const openSession = (s: Session) => {
    setSelected(s);
    loadEvents(s.id);
  };

  const filtered = useMemo(() => {
    let list = sessions;
    if (tempFilter !== "todos") list = list.filter((s) => s.temperature === tempFilter);
    if (filter.trim()) {
      const q = filter.toLowerCase();
      list = list.filter(
        (s) =>
          s.session_token.toLowerCase().includes(q) ||
          s.device?.toLowerCase().includes(q) ||
          s.source?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [sessions, tempFilter, filter]);

  const stats = useMemo(() => {
    const total = sessions.length;
    const quentes = sessions.filter((s) => s.temperature === "quente").length;
    const mornos = sessions.filter((s) => s.temperature === "morno").length;
    const frios = sessions.filter((s) => s.temperature === "frio").length;
    return { total, quentes, mornos, frios };
  }, [sessions]);

  /* ------ detail view ------ */
  if (selected) {
    const funnel = funnelStage(events);
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              {isMobile(selected.device) ? <Smartphone className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
              Visitante #{selected.session_token.slice(0, 8)}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 break-all">
              Token: {selected.session_token}
            </p>
          </div>
          {tempBadge(selected.temperature)}
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="rounded-2xl">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1"><BarChart3 className="h-3 w-3" /> Score</div>
              <div className="text-2xl font-bold">{selected.score}</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1"><Eye className="h-3 w-3" /> Páginas</div>
              <div className="text-2xl font-bold">{selected.total_pages}</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1"><MousePointerClick className="h-3 w-3" /> Cliques</div>
              <div className="text-2xl font-bold">{selected.total_clicks}</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Tempo</div>
              <div className="text-2xl font-bold">{fmtDuration(selected.total_time_seconds)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Funnel */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-2"><CardTitle className="text-base">Funil de Afunilamento</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${funnel.pct}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>Descoberta</span>
                  <span>Consideração</span>
                  <span>Interesse</span>
                  <span>Conversão</span>
                </div>
              </div>
              <Badge variant="outline" className={`${funnel.color} font-semibold`}>{funnel.label}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Card className="rounded-2xl">
            <CardHeader className="pb-2"><CardTitle className="text-base">Informações</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Primeira visita:</span> {fmtDate(selected.first_seen_at)}</div>
              <div><span className="text-muted-foreground">Última atividade:</span> {fmtDate(selected.last_seen_at)}</div>
              <div><span className="text-muted-foreground">Dispositivo:</span> {isMobile(selected.device) ? "Mobile" : "Desktop"}</div>
              <div><span className="text-muted-foreground">Scroll máx.:</span> {selected.scroll_depth}%</div>
              <div><span className="text-muted-foreground">Origem:</span> {selected.source || "Direta"}</div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="pb-2"><CardTitle className="text-base">Resumo de Eventos</CardTitle></CardHeader>
            <CardContent>
              {eventsLoading ? (
                <p className="text-muted-foreground text-sm">Carregando...</p>
              ) : (
                <div className="space-y-1 text-sm">
                  {Object.entries(
                    events.reduce((acc, e) => {
                      acc[e.type] = (acc[e.type] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>),
                  )
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">{eventIcon(type)} {eventLabel(type)}</span>
                        <Badge variant="secondary" className="text-xs">{count}</Badge>
                      </div>
                    ))}
                  {events.length === 0 && <p className="text-muted-foreground">Nenhum evento registrado.</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-2"><CardTitle className="text-base">Timeline de Atividade</CardTitle></CardHeader>
          <CardContent>
            {eventsLoading ? (
              <p className="text-muted-foreground text-sm">Carregando...</p>
            ) : events.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum evento registrado.</p>
            ) : (
              <div className="relative pl-5 space-y-3 max-h-[500px] overflow-y-auto">
                <div className="absolute left-[9px] top-1 bottom-1 w-px bg-border" />
                {events.map((ev) => (
                  <div key={ev.id} className="relative flex gap-3">
                    <div className="absolute -left-5 top-1 w-[18px] h-[18px] rounded-full bg-background border-2 border-primary flex items-center justify-center">
                      {eventIcon(ev.type)}
                    </div>
                    <div className="min-w-0 flex-1 pl-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{eventLabel(ev.type)}</span>
                        <span className="text-xs text-muted-foreground">{fmtDate(ev.created_at)}</span>
                      </div>
                      {ev.path && <div className="text-xs text-muted-foreground truncate">📍 {ev.path}</div>}
                      {ev.product_id && <div className="text-xs text-muted-foreground">🏷️ Produto: {ev.product_id.slice(0, 8)}…</div>}
                      {ev.metadata && Object.keys(ev.metadata).length > 0 && ev.type !== "page_view" && (
                        <div className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">
                          {JSON.stringify(ev.metadata).slice(0, 120)}
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Análise de Clientes</h1>
        <p className="text-sm text-muted-foreground">Visitantes rastreados automaticamente via cookies — ativação automática em 5s.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="rounded-2xl cursor-pointer hover:ring-2 ring-primary/30 transition-all" onClick={() => setTempFilter("todos")}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Total</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl cursor-pointer hover:ring-2 ring-red-500/30 transition-all" onClick={() => setTempFilter("quente")}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-red-500 flex items-center gap-1"><Flame className="h-3 w-3" /> Quentes</div>
            <div className="text-2xl font-bold text-red-600">{stats.quentes}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl cursor-pointer hover:ring-2 ring-amber-500/30 transition-all" onClick={() => setTempFilter("morno")}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-amber-500 flex items-center gap-1"><ThermometerSun className="h-3 w-3" /> Mornos</div>
            <div className="text-2xl font-bold text-amber-600">{stats.mornos}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl cursor-pointer hover:ring-2 ring-blue-500/30 transition-all" onClick={() => setTempFilter("frio")}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-blue-500 flex items-center gap-1"><Snowflake className="h-3 w-3" /> Frios</div>
            <div className="text-2xl font-bold text-blue-600">{stats.frios}</div>
          </CardContent>
        </Card>
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
              <Button variant="ghost" size="sm" onClick={() => setTempFilter("todos")} className="text-xs">Limpar filtro</Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="text-muted-foreground py-8 text-center">Carregando visitantes...</div>
          ) : filtered.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">Nenhum visitante encontrado.</div>
          ) : (
            filtered.map((s) => (
              <div
                key={s.id}
                onClick={() => openSession(s)}
                className="rounded-xl border border-border bg-card/60 backdrop-blur p-3 flex items-center gap-3 cursor-pointer hover:bg-accent/30 transition-colors group"
              >
                <div className="flex-shrink-0">
                  {isMobile(s.device) ? <Smartphone className="h-5 w-5 text-muted-foreground" /> : <Monitor className="h-5 w-5 text-muted-foreground" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">#{s.session_token.slice(0, 8)}</span>
                    {tempBadge(s.temperature)}
                    <Badge variant="outline" className="text-[10px]">Score {s.score}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3">
                    <span>{s.total_pages} pág.</span>
                    <span>{s.total_clicks} cliques</span>
                    <span>{fmtDuration(s.total_time_seconds)}</span>
                    <span>{fmtDate(s.last_seen_at)}</span>
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
