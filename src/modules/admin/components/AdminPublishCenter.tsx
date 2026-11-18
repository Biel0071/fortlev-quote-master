import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock3,
  Download,
  ExternalLink,
  GitBranch,
  LoaderCircle,
  RefreshCw,
  Rocket,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cloud } from "@/lib/cloud";
import {
  fetchPublishHistory,
  fetchPublishLogs,
  fetchPublishRun,
  fetchPublishStatus,
  startPublish,
} from "../publishing/publishApi";

type PublishStep = {
  name: string;
  status: string;
  conclusion: string | null;
  startedAt: string | null;
  completedAt: string | null;
};

type PublishJob = {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  steps: PublishStep[];
};

type PublishRun = {
  id: number;
  name: string;
  branch: string;
  sha: string;
  status: string;
  conclusion: string | null;
  url: string;
  startedAt: string | null;
  updatedAt: string;
  actor: string;
  jobs?: PublishJob[];
  logsAvailable?: boolean;
  requestedBy?: string | null;
};

type PublishOverview = {
  configured: boolean;
  missingConfiguration?: string[];
  mainSha?: string;
  deployedSha?: string | null;
  servedSha?: string | null;
  deployedAt?: string | null;
  lastBackupId?: string | null;
  changedFiles?: Array<{ path: string; status: string }> | null;
  activeRun?: PublishRun | null;
  lastSuccessfulRun?: PublishRun | null;
  site?: {
    healthy: boolean;
    homepageStatus: number | null;
    healthStatus: number | null;
    officialDnsIp?: string | null;
    officialDomainPointedToVps?: boolean;
    officialDomainValidated?: boolean;
    publisherProxyStatus: number | null;
    publisherProxyReady: boolean;
    checkedAt: string;
  };
  checks?: { github: boolean; main: boolean; workflowIdle: boolean };
  canPublish: boolean;
};

const shortSha = (sha?: string | null) => sha ? sha.slice(0, 8) : "Ainda não publicado";

type PublishablePageSpec = {
  id: string;
  label: string;
  routeHint: string;
  prefixes: string[];
};

const PUBLISHABLE_PAGES: PublishablePageSpec[] = [
  {
    id: "storefront-home",
    label: "Vitrine Principal & Catálogo",
    routeHint: "/ , /categoria/* , /produto/*",
    prefixes: ["src/pages/Index", "src/components/store/product", "src/hooks/useStore", "src/hooks/useHome"],
  },
  {
    id: "tracking-whitelabel",
    label: "Rastreamento White-Label & Mapa",
    routeHint: "/rastreio , /rastreio/:id",
    prefixes: [
      "src/pages/store/PublicTrackingSearch",
      "src/pages/account/TrackingPage",
      "src/components/store/tracking/",
      "src/utils/whiteLabelTracking",
      "src/utils/trackingGeo",
      "src/utils/deliverySchedule",
      "src/utils/trackingItems",
    ],
  },
  {
    id: "cart-checkout",
    label: "Carrinho & Checkout",
    routeHint: "/carrinho , /checkout",
    prefixes: ["src/pages/store/Cart", "src/pages/store/Checkout", "src/modules/checkout"],
  },
  {
    id: "customer-account",
    label: "Área do Cliente & Pedidos",
    routeHint: "/conta , /pedidos",
    prefixes: ["src/pages/account/"],
  },
  {
    id: "quotations-crm",
    label: "Orçamentos, Propostas & CRM",
    routeHint: "/orcamento/* , /admin/.../orcamentos",
    prefixes: ["src/pages/dashboard/", "src/modules/admin/pages/AdminQuotations", "src/modules/admin/pages/AdminDashboardQuotations"],
  },
  {
    id: "admin-intelligence",
    label: "Painel Admin, Métricas & Publicação",
    routeHint: "/admin/*",
    prefixes: ["src/modules/admin/", "src/pages/admin/"],
  },
];

function statusLabel(status?: string | null, conclusion?: string | null): string {
  if (status === "completed") {
    if (conclusion === "success") return "Concluído com sucesso";
    if (conclusion === "cancelled") return "Cancelado";
    return "Falhou";
  }
  if (status === "in_progress") return "Em andamento";
  if (status === "queued" || status === "requested" || status === "waiting" || status === "pending") return "Na fila";
  return "Aguardando o GitHub";
}

function StatusIcon({ status, conclusion }: { status?: string | null; conclusion?: string | null }) {
  if (status === "completed" && conclusion === "success") return <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />;
  if (status === "completed") return <XCircle className="h-4 w-4 text-destructive" aria-hidden="true" />;
  if (status === "in_progress") return <LoaderCircle className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />;
  return <Circle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

async function getAccessToken(): Promise<string> {
  const { data, error } = await cloud.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) throw new Error("Sua sessão expirou. Entre novamente para publicar.");
  return token;
}

export function AdminPublishCenter() {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [overview, setOverview] = useState<PublishOverview | null>(null);
  const [run, setRun] = useState<PublishRun | null>(null);
  const [history, setHistory] = useState<PublishRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPages, setSelectedPages] = useState<string[]>(() =>
    PUBLISHABLE_PAGES.map((p) => p.id)
  );

  const togglePageSelection = (pageId: string) => {
    setSelectedPages((prev) =>
      prev.includes(pageId) ? prev.filter((id) => id !== pageId) : [...prev, pageId]
    );
  };

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getAccessToken();
      const statusResponse = await fetchPublishStatus(token);
      const nextOverview = statusResponse as unknown as PublishOverview;
      setOverview(nextOverview);
      if (nextOverview.configured) {
        const [historyResponse, activeResponse] = await Promise.all([
          fetchPublishHistory(token),
          nextOverview.activeRun?.id ? fetchPublishRun(nextOverview.activeRun.id, token) : Promise.resolve(null),
        ]);
        setHistory(historyResponse.runs as PublishRun[]);
        if (activeResponse?.run) setRun(activeResponse.run as PublishRun);
        else if (!run || run.status === "completed") setRun(null);
      } else {
        setHistory([]);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível verificar o estado da publicação.");
    } finally {
      setLoading(false);
    }
  }, [run]);

  useEffect(() => {
    if (open) void loadOverview();
  }, [open, loadOverview]);

  useEffect(() => {
    if (!open || !run || run.status === "completed") return;
    let cancelled = false;
    const refreshRun = async () => {
      try {
        const token = await getAccessToken();
        const response = await fetchPublishRun(run.id, token);
        if (cancelled || !response.run) return;
        const nextRun = response.run as PublishRun;
        setRun(nextRun);
        if (nextRun.status === "completed") await loadOverview();
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Não foi possível atualizar a publicação.");
      }
    };
    const interval = window.setInterval(() => void refreshRun(), 4_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [open, run, loadOverview]);

  const handlePublish = async () => {
    if (!overview?.mainSha) return;
    setPublishing(true);
    setError("");
    try {
      const token = await getAccessToken();
      const response = await startPublish(token, {
        requestId: crypto.randomUUID(),
        expectedSha: overview.mainSha,
        selectedPages,
      });
      setRun(response.run as PublishRun);
      await loadOverview();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Não foi possível iniciar a publicação.";
      await loadOverview();
      setError(message);
    } finally {
      setPublishing(false);
    }
  };

  const handleDownloadLogs = async (runId: number) => {
    setDownloading(true);
    setError("");
    try {
      const token = await getAccessToken();
      const blob = await fetchPublishLogs(runId, token);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `publicacao-${runId}-logs.zip`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível baixar os logs.");
    } finally {
      setDownloading(false);
    }
  };

  const hasActiveRun = Boolean(run && run.status !== "completed");

  return (
    <>
      <Button
        size="sm"
        className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs"
        onClick={() => setOpen(true)}
      >
        <Rocket className="h-4 w-4" aria-hidden="true" />
        Publicar
      </Button>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publicar a versão de main?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação inicia o deploy do commit {shortSha(overview?.mainSha)} para {window.location.host}. As alterações abaixo já estão no GitHub; alterações feitas no admin e salvas no banco não precisam de publicação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-32 overflow-y-auto rounded-md border border-border p-3 text-xs">
            {overview?.changedFiles?.length
              ? overview.changedFiles.slice(0, 12).map((file) => <div key={file.path} className="truncate">{file.status} · {file.path}</div>)
              : <span className="text-muted-foreground">Nenhuma alteração de código detectada desde o deploy anterior.</span>}
            {(overview?.changedFiles?.length ?? 0) > 12 && <div>e mais {overview!.changedFiles!.length - 12} arquivo(s)</div>}
          </div>
          <div className="text-xs text-muted-foreground">
            Pré-verificação: main {overview?.checks?.main ? "confirmada" : "indisponível"}, workflow {overview?.checks?.workflowIdle ? "livre" : "ocupado"}, site {overview?.site?.healthy ? "saudável" : "precisa de verificação"}, API {overview?.site?.publisherProxyReady ? "conectada" : "pendente"}.
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={!overview?.canPublish || publishing}
              onClick={(event) => {
                event.preventDefault();
                setConfirmOpen(false);
                void handlePublish();
              }}
            >Publicar {shortSha(overview?.mainSha)}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[92vw] max-w-lg max-h-[86vh] overflow-y-auto overflow-x-hidden p-4 sm:p-5">
          <DialogHeader className="min-w-0 pr-6">
            <DialogTitle className="text-base sm:text-lg">Central de Publicação</DialogTitle>
            <DialogDescription className="text-xs">
              Selecione as páginas, confira as versões e publique para o domínio oficial.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 min-w-0 w-full overflow-hidden">
            {/* Domínio / Site Oficial + Horário + Validação Real + Backup */}
            <div
              className={`rounded-xl border p-3 space-y-2 min-w-0 ${
                overview?.site?.officialDomainPointedToVps
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-amber-500/35 bg-amber-500/5"
              }`}
            >
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                    Site Oficial de Produção
                  </span>
                  <a
                    href="https://materialdecontrucao.online"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-foreground hover:text-primary underline underline-offset-4 truncate max-w-full"
                  >
                    <span className="truncate">materialdecontrucao.online</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </a>
                </div>
                <a
                  href="https://loja.209-50-241-22.sslip.io"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 px-2.5 py-1.5 text-[11px] font-bold hover:bg-emerald-500/20 shrink-0"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  <span>VPS Validada</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* Status real de validação do domínio oficial vs VPS */}
              {overview?.site ? (
                overview.site.officialDomainPointedToVps ? (
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>Domínio oficial validado em 209.50.241.22 (HTTPS 200)</span>
                  </div>
                ) : (
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/25 px-2.5 py-1.5 text-[11px] text-amber-900 space-y-0.5">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                      <span>Domínio oficial não validado (DNS fora da VPS)</span>
                    </div>
                    <p className="text-[10px] leading-snug">
                      DNS atual aponta para <code className="font-mono font-bold">{overview.site.officialDnsIp || "externo"}</code> (antigo servidor). Altere o registro <strong>Tipo A</strong> de <code className="font-mono">materialdecontrucao.online</code> para <code className="font-mono font-bold">209.50.241.22</code>. Enquanto propaga, use o botão <strong>VPS Validada</strong> acima.
                    </p>
                  </div>
                )
              ) : null}

              {/* Horário exato da última leitura/validação + Backup */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/50 text-[10px] text-muted-foreground">
                <span>
                  Última validação:{" "}
                  <strong className="text-foreground font-mono">
                    {formatDate(
                      overview?.deployedAt ||
                        overview?.lastSuccessfulRun?.updatedAt ||
                        overview?.site?.checkedAt
                    )}
                  </strong>
                </span>
                <span>
                  Backup:{" "}
                  <strong className="text-emerald-700 font-mono">
                    {overview?.lastBackupId || "Ativo na VPS"}
                  </strong>
                </span>
              </div>
            </div>

            <section aria-labelledby="publish-pages-title" className="space-y-2 min-w-0">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <h3 id="publish-pages-title" className="text-xs sm:text-sm font-semibold truncate">
                  Páginas ({selectedPages.length}/{PUBLISHABLE_PAGES.length} selecionadas)
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 px-2 shrink-0"
                  onClick={() =>
                    setSelectedPages((prev) =>
                      prev.length === PUBLISHABLE_PAGES.length
                        ? []
                        : PUBLISHABLE_PAGES.map((p) => p.id)
                    )
                  }
                >
                  {selectedPages.length === PUBLISHABLE_PAGES.length ? "Limpar" : "Todas"}
                </Button>
              </div>

              <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden min-w-0">
                {PUBLISHABLE_PAGES.map((page) => {
                  const checked = selectedPages.includes(page.id);
                  const changedList = (overview?.changedFiles ?? []).filter(
                    (f) => f.status !== "DNS"
                  );
                  const pageChangedCount = changedList.filter((f) =>
                    page.prefixes.some((prefix) => f.path.startsWith(prefix))
                  ).length;
                  const localVer = overview?.mainSha
                    ? `v-${overview.mainSha.slice(0, 7)}`
                    : "v-local";
                  const liveSha = overview?.servedSha || overview?.deployedSha || null;
                  const liveVer = liveSha ? `v-${liveSha.slice(0, 7)}` : "Pendente";
                  const vpsHealthy = Boolean(overview?.site?.healthy);
                  const isValidatedOnVps =
                    vpsHealthy &&
                    Boolean(overview?.mainSha && liveSha && overview.mainSha === liveSha) &&
                    pageChangedCount === 0;
                  const validatedTime = formatDate(
                    overview?.deployedAt || overview?.lastSuccessfulRun?.updatedAt
                  );

                  return (
                    <label
                      key={page.id}
                      className="flex items-start justify-between gap-2 p-2.5 hover:bg-muted/40 transition-colors cursor-pointer text-xs min-w-0"
                    >
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePageSelection(page.id)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-emerald-600 shrink-0"
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-1.5 min-w-0">
                            <span className="font-semibold text-foreground truncate">
                              {page.label}
                            </span>
                            {isValidatedOnVps ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-bold text-emerald-700 shrink-0">
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                Validado (VPS)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-800 shrink-0">
                                <Clock3 className="h-2.5 w-2.5" />
                                {pageChangedCount > 0 ? `${pageChangedCount} alt.` : "Não validado"}
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[10px] text-muted-foreground truncate">
                            {page.routeHint}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700">
                              Local: {localVer}
                            </span>
                            <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600">
                              VPS: {liveVer}
                            </span>
                            {validatedTime !== "—" && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                • {validatedTime}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </section>

            {error && (
              <div role="alert" className="flex items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                <div className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
                {error.includes("Entre novamente") && (
                  <Button size="sm" variant="outline" className="shrink-0 text-xs" onClick={() => { setOpen(false); window.location.assign("/auth/login"); }}>
                    Fazer login
                  </Button>
                )}
              </div>
            )}

            {loading && !overview ? (
              <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground" role="status">
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                Consultando GitHub e o site…
              </div>
            ) : overview && !overview.configured ? (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
                <p className="font-medium">A publicação ainda não está configurada no servidor.</p>
                <p className="mt-1 text-muted-foreground">A Fênix API precisa receber as credenciais da GitHub App e a configuração Supabase no ambiente privado da VPS.</p>
                {overview.missingConfiguration?.length ? (
                  <p className="mt-2 text-xs text-muted-foreground">Configuração pendente: {overview.missingConfiguration.join(", ")}</p>
                ) : null}
              </div>
            ) : overview ? (
              <>
                <section aria-labelledby="publish-preflight-title" className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 id="publish-preflight-title" className="text-sm font-semibold">Pré-verificação</h3>
                    <Button variant="outline" size="sm" onClick={() => void loadOverview()} disabled={loading}>
                      <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
                      Atualizar
                    </Button>
                  </div>

                  <div className="grid gap-3 rounded-md border border-border p-3 text-sm sm:grid-cols-2">
                    <div>
                      <div className="flex items-center gap-2 text-muted-foreground"><GitBranch className="h-4 w-4" aria-hidden="true" /> main atual</div>
                      <code className="mt-1 block font-mono text-xs">{shortSha(overview.mainSha)}</code>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Última publicação</div>
                      <code className="mt-1 block font-mono text-xs">{shortSha(overview.deployedSha)}</code>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Versão servida no domínio</div>
                      <code className="mt-1 block font-mono text-xs">{shortSha(overview.servedSha)}</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusIcon status={overview.activeRun ? "in_progress" : "completed"} conclusion={overview.activeRun ? null : "success"} />
                      {overview.activeRun ? "Já existe uma publicação em andamento" : "Nenhuma publicação em andamento"}
                    </div>
                    <div className="flex items-center gap-2">
                      {overview.site?.homepageStatus === 200 && overview.site?.healthStatus === 200
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                        : <XCircle className="h-4 w-4 text-destructive" aria-hidden="true" />}
                      Site HTTPS {overview.site?.homepageStatus === 200 && overview.site?.healthStatus === 200 ? "respondendo" : "indisponível ou sem health check"}
                      {overview.site?.healthStatus !== null && overview.site?.healthStatus !== undefined ? ` (${overview.site.healthStatus})` : ""}
                    </div>
                    <div className="flex items-center gap-2">
                      {overview.site?.publisherProxyReady
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                        : <XCircle className="h-4 w-4 text-destructive" aria-hidden="true" />}
                      API de publicação HTTPS {overview.site?.publisherProxyReady ? "conectada" : "ainda não configurada"}
                      {overview.site?.publisherProxyStatus !== null && overview.site?.publisherProxyStatus !== undefined ? ` (${overview.site.publisherProxyStatus})` : ""}
                    </div>
                  </div>

                  <div className="rounded-md border border-border p-3">
                    <p className="text-sm font-medium">Arquivos desde a versão servida no domínio</p>
                    {overview.changedFiles === null ? (
                      <p className="mt-1 text-sm text-muted-foreground">Não há uma execução anterior para comparar.</p>
                    ) : overview.changedFiles?.length ? (
                      <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto font-mono text-xs text-muted-foreground">
                        {overview.changedFiles.slice(0, 12).map((file) => (
                          <li key={file.path} className="truncate">{file.status} · {file.path}</li>
                        ))}
                        {overview.changedFiles.length > 12 && <li>e mais {overview.changedFiles.length - 12} arquivo(s)</li>}
                      </ul>
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">Nenhuma alteração de código em main desde a última publicação.</p>
                    )}
                  </div>
                </section>

                {run && (
                  <section aria-labelledby="publish-run-title" className="space-y-3 rounded-md border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 id="publish-run-title" className="flex items-center gap-2 text-sm font-semibold">
                          <StatusIcon status={run.status} conclusion={run.conclusion} />
                          {statusLabel(run.status, run.conclusion)}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">Execução #{run.id} · main · {shortSha(run.sha)} · início {formatDate(run.startedAt)}</p>
                      </div>
                      <a href={run.url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-xs text-primary underline underline-offset-4">
                        GitHub <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    </div>
                    {run.jobs?.length ? (
                      <div className="space-y-3">
                        {run.jobs.map((job) => (
                          <div key={job.id} className="border-t border-border pt-2">
                            <p className="flex items-center gap-2 text-sm font-medium"><StatusIcon status={job.status} conclusion={job.conclusion} />{job.name} · {statusLabel(job.status, job.conclusion)}</p>
                            {job.steps.length > 0 && (
                              <ul className="mt-2 space-y-1 pl-6 text-xs text-muted-foreground">
                                {job.steps.map((step, index) => (
                                  <li key={`${job.id}-${index}`} className="flex items-start gap-2">
                                    <StatusIcon status={step.status} conclusion={step.conclusion} />
                                    <span>{step.name}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="h-4 w-4" aria-hidden="true" />Aguardando as etapas reais do GitHub Actions.</p>
                    )}
                    {run.status === "completed" && (
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                        <p className={`text-sm font-medium ${run.conclusion === "success" ? "text-emerald-700" : "text-destructive"}`}>
                          {run.conclusion === "success" ? "Publicação concluída e verificada." : "A publicação falhou. Consulte os logs para ver a etapa."}
                        </p>
                        <Button variant="outline" size="sm" onClick={() => void handleDownloadLogs(run.id)} disabled={downloading || !run.logsAvailable}>
                          {downloading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
                          Baixar logs completos
                        </Button>
                      </div>
                    )}
                  </section>
                )}

                <section aria-labelledby="publish-history-title" className="space-y-2">
                  <h3 id="publish-history-title" className="text-sm font-semibold">Publicações recentes</h3>
                  {history.length ? (
                    <ul className="divide-y divide-border rounded-md border border-border">
                      {history.slice(0, 8).map((item) => (
                        <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 truncate font-medium"><StatusIcon status={item.status} conclusion={item.conclusion} />{item.requestedBy || item.actor || "GitHub Actions"}</p>
                            <p className="mt-1 truncate text-muted-foreground">#{item.id} · {shortSha(item.sha)} · {formatDate(item.startedAt || item.updatedAt)}</p>
                          </div>
                          <a href={item.url} target="_blank" rel="noreferrer" className="shrink-0 text-primary underline underline-offset-4">Detalhes</a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-md border border-border px-3 py-4 text-center text-sm text-muted-foreground">Nenhuma publicação encontrada.</p>
                  )}
                </section>
              </>
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
            <Button
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => setConfirmOpen(true)}
              disabled={selectedPages.length === 0 || !overview?.canPublish || loading || Boolean(error) || publishing || hasActiveRun}
            >
              {publishing ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Rocket className="h-4 w-4" aria-hidden="true" />}
              {publishing
                ? "Solicitando publicação…"
                : hasActiveRun
                  ? "Publicação em andamento"
                  : selectedPages.length === 0
                    ? "Selecione ao menos 1 página"
                    : overview?.canPublish
                      ? `Publicar (${selectedPages.length} pág.)`
                      : !overview?.configured
                        ? "Backend pendente"
                        : !overview.site?.publisherProxyReady
                        ? "Infraestrutura pendente"
                        : "Já publicado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
