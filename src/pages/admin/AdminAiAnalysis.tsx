import { useMemo, useState } from "react";
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
  { label: "/components", value: "src/components" },
  { label: "/pages", value: "src/pages" },
  { label: "/hooks", value: "src/hooks" },
  { label: "/lib", value: "src/lib" },
  { label: "/functions", value: "supabase/functions" },
] as const;

const fileMap = import.meta.glob(
  [
    "../components/**/*.{ts,tsx}",
    "../pages/**/*.{ts,tsx}",
    "../hooks/**/*.{ts,tsx}",
    "../lib/**/*.{ts,tsx}",
    "../../supabase/functions/**/*.ts",
  ],
  { as: "raw" },
);

function filterFilesByScope(scope: string) {
  const entries = Object.entries(fileMap);
  return entries.filter(([path]) => {
    if (scope.startsWith("src/")) {
      const normalized = path.replace(/^\.\.\//, "src/");
      return normalized.startsWith(scope);
    }
    if (scope === "supabase/functions") return path.includes("/supabase/functions/");
    return false;
  });
}

export default function AdminAiAnalysis() {
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>("quick");
  const [scope, setScope] = useState<(typeof SCOPE_OPTIONS)[number]["value"]>("src/components");
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
      const loaders = files.slice(0, mode === "quick" ? 30 : 120);

      const loaded = await Promise.all(
        loaders.map(async ([path, loader]) => {
          const content = await (loader as any)();
          const normalized = path.replace(/^\.\.\//, "src/").replace(/^\.\.\/\.\.\//, "");
          return { path: normalized, content: String(content) };
        }),
      );

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

  const downloadReport = () => {
    if (!rawJson) return;
    const blob = new Blob([rawJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-ia-${mode}-${scope.replace(/\//g, "-")}-${Date.now()}.json`;
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
              Baixar relatório (.json)
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
