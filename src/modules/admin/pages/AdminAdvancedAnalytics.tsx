import { useEffect, useMemo, useState } from "react";
import { cloud } from "@/lib/cloud";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

type SessionRow = {
  id: string;
  session_token: string;
  temperature: "frio" | "morno" | "quente";
  score: number;
  first_seen_at: string;
  last_seen_at: string;
};

function heatLabel(temperature: string, score: number) {
  if (temperature === "quente" || score >= 71) return { label: "Quente", variant: "default" as const };
  if (temperature === "morno" || score >= 31) return { label: "Morno", variant: "secondary" as const };
  return { label: "Frio", variant: "outline" as const };
}

export default function AdminAdvancedAnalytics() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const hotSessions = useMemo(() => sessions.filter((s) => s.temperature === "quente"), [sessions]);

  useEffect(() => {
    let alive = true;
    const lastNotified = new Set<string>();

    const tick = async () => {
      try {
        setLoading(true);
        const since = new Date(Date.now() - 1000 * 60 * 30).toISOString();

        const { data, error } = await cloud
          .from("tracking_sessions")
          .select("id, session_token, temperature, score, first_seen_at, last_seen_at")
          .gte("first_seen_at", since)
          .order("score", { ascending: false })
          .limit(50);

        if (!alive) return;
        if (error) throw error;

        const rows = (data ?? []) as SessionRow[];
        setSessions(rows);

        for (const s of rows) {
          if (s.temperature === "quente" && (s.score ?? 0) > 90 && !lastNotified.has(s.id)) {
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

    void tick();
    const i = window.setInterval(() => void tick(), 5000);
    return () => {
      alive = false;
      window.clearInterval(i);
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Analytics avançado</h1>
        <p className="text-sm text-muted-foreground">Sessões e leads com tracking unificado.</p>
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
                const heat = heatLabel(s.temperature, Number(s.score ?? 0));
                return (
                  <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">Sessão {s.session_token.slice(0, 12)}…</div>
                      <div className="text-xs text-muted-foreground">
                        Início: {new Date(s.first_seen_at).toLocaleTimeString()} • Última ação: {new Date(s.last_seen_at).toLocaleTimeString()}
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
