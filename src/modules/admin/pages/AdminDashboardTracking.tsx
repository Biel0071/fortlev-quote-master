import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters";
import { useAdminDashboardInsights } from "@/hooks/useAdminDashboardInsights";

function statusBadge(status: string) {
  if (status === "quente") return "default" as const;
  if (status === "morno") return "secondary" as const;
  return "outline" as const;
}

export default function AdminDashboardTracking() {
  const { data } = useAdminDashboardInsights();

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Clientes quentes agora</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.lists.hotLeads.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhum lead quente no momento.</div>
          ) : (
            data.lists.hotLeads.map((lead) => (
              <div key={lead.session_id} className="rounded-xl border border-border p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">Sessão {lead.session_id.slice(0, 12)}…</div>
                  <div className="text-xs text-muted-foreground">{lead.device} • {lead.source}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusBadge(lead.status)}>{lead.status}</Badge>
                  <span className="font-semibold">{lead.score}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Carrinhos abandonados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.lists.abandonedCarts.length === 0 ? (
            <div className="text-sm text-muted-foreground">Sem carrinhos abandonados.</div>
          ) : (
            data.lists.abandonedCarts.map((cart) => (
              <div key={cart.id} className="rounded-xl border border-border p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">Sessão {cart.session_id.slice(0, 12)}…</div>
                  <div className="text-xs text-muted-foreground">{new Date(cart.updated_at).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(cart.total)}</div>
                  <div className="text-xs text-muted-foreground">{cart.recovery_status}</div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl xl:col-span-2">
        <CardHeader>
          <CardTitle>Últimos clientes navegando</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.lists.recentActivity.length === 0 ? (
            <div className="text-sm text-muted-foreground">Sem atividade recente.</div>
          ) : (
            data.lists.recentActivity.slice(0, 20).map((event, idx) => (
              <div key={`${event.session_id}-${event.created_at}-${idx}`} className="rounded-xl border border-border p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{event.type}</div>
                  <div className="text-xs text-muted-foreground truncate">Sessão {event.session_id.slice(0, 12)}…</div>
                </div>
                <div className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleTimeString()}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
