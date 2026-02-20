import { useEffect, useMemo, useState } from "react";
import { cloud } from "@/lib/cloud";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

type SessionRow = {
  id: string;
  session_token: string;
  consent_given: boolean;
  score: number;
  started_at: string;
  updated_at: string;
};

function heatLabel(score: number) {
  if (score >= 100) return { label: "Muito quente", variant: "default" as const };
  if (score >= 61) return { label: "Quente", variant: "secondary" as const };
  if (score >= 31) return { label: "Morno", variant: "outline" as const };
  return { label: "Frio", variant: "secondary" as const };
}

export default function AdminAdvancedAnalytics() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const hotSessions = useMemo(() => sessions.filter((s) => (s.score ?? 0) > 60), [sessions]);

  useEffect(() => {
    let alive = true;
    let lastNotified = new Set<string>();

    const tick = async () => {
      try {
        setLoading(true);
        const since = new Date(Date.now() - 1000 * 60 * 30).toISOString();

        const { data, error } = await cloud
          .from("visitor_sessions")
          .select("id, session_token, consent_given, score, started_at, updated_at")
          .gte("started_at", since)
          .order("score", { ascending: false })
          .limit(50);

        if (!alive) return;
        if (error) throw error;

        const rows = (data ?? []) as any as SessionRow[];
        setSessions(rows);

        // Notify very hot leads
        for (const s of rows) {
          if ((s.score ?? 0) > 90 && !lastNotified.has(s.id)) {
            lastNotified.add(s.id);
            toast({
              title: "Lead muito quente",
              description: `Score ${s.score}. Sessão ${s.session_token.slice(0, 8)}…`,
            });
          }
        }
      } catch (e: any) {
        if (!alive) return;
        toast({ title: "Falha ao carregar analytics", description: e?.message ?? "Erro inesperado", variant: "destructive" });
      } finally {
        if (alive) setLoading(false);
      }
    };

    tick();
    const i = window.setInterval(tick, 5000);
    return () => {
      alive = false;
      window.clearInterval(i);
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Analytics avançado</h1>
        <p className="text-sm text-muted-foreground">Sessões e leads com base no tracking (com consentimento).</p>
      </header>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Sessões (30 min)</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{loading ? "…" : sessions.length}</CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Leads quentes</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{loading ? "…" : hotSessions.length}</CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Atualização</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Auto a cada 5s</CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Leads agora</CardTitle>
          <Button variant="outline" className="rounded-xl" onClick={() => window.location.reload()}>
            Atualizar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhuma sessão recente.</div>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => {
                const heat = heatLabel(Number(s.score ?? 0));
                return (
                  <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">Sessão {s.session_token.slice(0, 12)}…</div>
                      <div className="text-xs text-muted-foreground">
                        {s.consent_given ? "Consentimento: sim" : "Consentimento: não"} • Início: {new Date(s.started_at).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={heat.variant}>{heat.label}</Badge>
                      <div className="font-semibold w-12 text-right">{s.score}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
