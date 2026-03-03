import { useMemo, useState } from "react";
import JSZip from "jszip";
import { cloud } from "@/lib/cloud";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type Mode = "quick" | "deep";

type FullReport = {
  generated_at?: string;
  mode?: string;
  scope?: string;
  files_received?: number;
  files_analyzed?: number;
  payload_chars?: number;
  truncated?: boolean;
  analyzed_paths?: string[];
  analysis?: Record<string, unknown>;
};

const SCOPE_OPTIONS = [
  { label: "Projeto completo", value: "all" },
  { label: "/components", value: "src/components" },
  { label: "/pages", value: "src/pages" },
  { label: "/hooks", value: "src/hooks" },
  { label: "/lib", value: "src/lib" },
  { label: "/functions", value: "supabase/functions" },
] as const;

const ROOT_EXPORT_FILES = new Set(["package.json", "tsconfig.json", "vite.config.ts", ".env.example"]);

const fileMap = import.meta.glob(
  [
    "../../../../**/*.{ts,tsx,css,json,md}",
    "../../../../supabase/**/*.{ts,tsx,sql,json,toml,md}",
    "../../../../package.json",
    "../../../../tsconfig.json",
    "../../../../vite.config.ts",
    "../../../../.env.example",
  ],
  { as: "raw" },
);

function normalizeProjectPath(path: string) {
  if (path.startsWith("../../../../")) return path.slice(12);
  if (path.startsWith("../../../")) return `src/${path.slice(9)}`;
  if (path.startsWith("../../")) return `src/modules/${path.slice(6)}`;
  if (path.startsWith("../")) return `src/modules/admin/${path.slice(3)}`;
  if (path.startsWith("./")) return path.slice(2);
  return path;
}

function isIgnoredPath(path: string) {
  return path.includes("/node_modules/") || path.includes("/dist/") || path.endsWith(".zip") || path.endsWith(".log");
}

function filterFilesByScope(scope: string) {
  const entries = Object.entries(fileMap);
  if (scope === "all") return entries.filter(([path]) => !isIgnoredPath(normalizeProjectPath(path)));

  return entries.filter(([path]) => {
    const normalized = normalizeProjectPath(path);
    if (isIgnoredPath(normalized)) return false;
    if (scope.startsWith("src/")) return normalized.startsWith(scope);
    if (scope === "supabase/functions") return normalized.startsWith("supabase/functions/");
    return false;
  });
}

async function loadEntries(entries: [string, unknown][]) {
  const loaded = await Promise.all(
    entries.map(async ([path, loader]) => {
      const content = await (loader as () => Promise<string>)();
      return { path: normalizeProjectPath(path), content: String(content) };
    }),
  );

  return loaded.filter((file) => !!file.path && !isIgnoredPath(file.path));
}

export default function AdminAiAnalysis() {
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>("quick");
  const [scope, setScope] = useState<(typeof SCOPE_OPTIONS)[number]["value"]>("all");
  const [loading, setLoading] = useState(false);
  const [rawJson, setRawJson] = useState<string>("");
  const [reportObj, setReportObj] = useState<FullReport | null>(null);

  const scopeLabel = useMemo(() => SCOPE_OPTIONS.find((x) => x.value === scope)?.label || scope, [scope]);

  const run = async () => {
    setLoading(true);
    setRawJson("");
    setReportObj(null);

    try {
      const files = filterFilesByScope(scope);
      const loaders = files.slice(0, mode === "quick" ? 80 : 240);
      const loaded = await loadEntries(loaders as [string, unknown][]);

      const { data, error } = await cloud.functions.invoke("analyze-project-structure", {
        body: { mode, scope, files: loaded },
      });
      if (error) throw error;

      const report = ((data as any)?.report_json ?? null) as FullReport | null;
      const serialized = JSON.stringify(report ?? data ?? {}, null, 2);

      setReportObj(report);
      setRawJson(serialized);

      const { data: u } = await cloud.auth.getUser();
      await cloud.from("ai_project_reports").insert({
        created_by: u.user?.id ?? null,
        mode,
        selected_scope: scope,
        report_json: (report ?? { raw: data }) as any,
      } as any);

      toast({ title: "Relatório gerado", description: `Análise (${mode}) para ${scopeLabel} salva no histórico.` });
    } catch (e: any) {
      toast({
        title: "Falha na análise",
        description: e?.message || "Erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async () => {
    if (!rawJson || !reportObj) return;

    if ((reportObj.files_received ?? 0) <= 0 || (reportObj.files_analyzed ?? 0) <= 0 || (reportObj.payload_chars ?? 0) <= 0) {
      toast({
        title: "Relatório incompleto",
        description: "Gere novamente a análise antes de exportar o pacote completo.",
        variant: "destructive",
      });
      return;
    }

    const analysis = reportObj.analysis ?? {};
    const asList = (key: string) => ((analysis as Record<string, unknown>)[key] as string[] | undefined) ?? [];

    const summary = [
      "# Relatório IA Completo",
      "",
      `Gerado em: ${reportObj.generated_at ?? "-"}`,
      `Modo: ${reportObj.mode ?? mode}`,
      `Escopo: ${reportObj.scope ?? scope}`,
      `Arquivos recebidos: ${reportObj.files_received ?? 0}`,
      `Arquivos analisados: ${reportObj.files_analyzed ?? 0}`,
      `Payload chars: ${reportObj.payload_chars ?? 0}`,
      `Truncamento: ${reportObj.truncated ? "Sim" : "Não"}`,
      "",
      "## Pontos de melhoria",
      ...asList("improvement_points").map((x) => `- ${x}`),
      "",
      "## Sugestões de refatoração",
      ...asList("refactor_suggestions").map((x) => `- ${x}`),
      "",
      "## Plano de ação",
      ...asList("action_plan").map((x) => `- ${x}`),
    ].join("\n");

    const baseEntries = filterFilesByScope(scope);
    const supplementalEntries = Object.entries(fileMap).filter(([path]) => {
      const normalized = normalizeProjectPath(path);
      return ROOT_EXPORT_FILES.has(normalized) || normalized.startsWith("supabase/functions/");
    });

    const sourceFiles = await loadEntries([...(baseEntries as [string, unknown][]), ...(supplementalEntries as [string, unknown][])]);
    const uniqueFiles = new Map<string, string>();

    sourceFiles.forEach((file) => {
      if (!file.path || isIgnoredPath(file.path)) return;
      uniqueFiles.set(file.path, file.content);
    });

    if (!uniqueFiles.has(".env.example")) {
      uniqueFiles.set(
        ".env.example",
        [
          "# Exemplo de variáveis (não inclua segredos)",
          "VITE_SUPABASE_URL=",
          "VITE_SUPABASE_PUBLISHABLE_KEY=",
          "VITE_SUPABASE_PROJECT_ID=",
        ].join("\n"),
      );
    }

    if (uniqueFiles.size === 0) {
      toast({
        title: "Nenhum arquivo encontrado",
        description: "Não foi possível montar o ZIP com arquivos reais do projeto.",
        variant: "destructive",
      });
      return;
    }

    const zip = new JSZip();
    uniqueFiles.forEach((content, filePath) => zip.file(filePath, content));

    zip.file("relatorio-completo.json", rawJson);
    zip.file("resumo-executivo.md", summary);
    zip.file("arquivos-analisados.txt", (reportObj.analyzed_paths ?? []).join("\n"));

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `projeto-completo-${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Análise IA do projeto</h1>
        <p className="text-sm text-muted-foreground">
          Gere relatórios técnicos completos (arquitetura, refatoração, performance, segurança e plano de ação).
        </p>
      </header>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Configuração</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Modo</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quick">Análise rápida</SelectItem>
                <SelectItem value="deep">Análise profunda</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Pasta</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as any)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {SCOPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button onClick={run} disabled={loading} className="rounded-xl w-full">
              {loading ? "Gerando..." : "Gerar relatório completo do sistema"}
            </Button>
          </div>

          <div className="md:col-span-3 text-xs text-muted-foreground">
            Nota: o modo rápido analisa uma amostra; o modo profundo analisa mais arquivos e pode demorar mais.
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Resumo técnico</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="rounded-xl border border-border p-3">Arquivos recebidos: <strong>{reportObj?.files_received ?? 0}</strong></div>
          <div className="rounded-xl border border-border p-3">Arquivos analisados: <strong>{reportObj?.files_analyzed ?? 0}</strong></div>
          <div className="rounded-xl border border-border p-3">Payload chars: <strong>{reportObj?.payload_chars ?? 0}</strong></div>
          <div className="rounded-xl border border-border p-3">Truncamento: <strong>{reportObj?.truncated ? "Sim" : "Não"}</strong></div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle>Relatório completo (JSON)</CardTitle>
            <Button variant="outline" onClick={downloadReport} disabled={!rawJson}>
              Baixar relatório completo (.zip)
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={rawJson}
            readOnly
            placeholder="O JSON completo do relatório aparecerá aqui..."
            className="min-h-[320px] rounded-xl font-mono text-xs"
          />
        </CardContent>
      </Card>
    </div>
  );
}
