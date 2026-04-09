import { useEffect, useMemo, useState } from "react";
import { Copy, Eye, ShieldPlus, Ban } from "lucide-react";
import { cloud } from "@/lib/cloud";
import { useStore } from "@/contexts/StoreContext";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type TokenRow = {
  id: string;
  store_id: string;
  name: string;
  token_preview: string;
  token: string | null;
  status: "active" | "revoked";
  access_scope: "fortlev" | "construction" | "both";
  expires_at: string;
  created_at: string;
  last_access_at: string | null;
  uses_count: number;
  max_uses: number | null;
};

type TokenLog = {
  id: string;
  action: string;
  ip: string | null;
  quotation_type: string | null;
  quotation_id: string | null;
  created_at: string;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR");
}

function getTokenStatus(token: TokenRow): "active" | "expired" | "revoked" {
  if (token.status === "revoked") return "revoked";
  if (new Date(token.expires_at).getTime() <= Date.now()) return "expired";
  return "active";
}

export default function AdminQuotationTokens() {
  const { activeStoreId } = useStore();
  const [loading, setLoading] = useState(true);
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [logs, setLogs] = useState<TokenLog[]>([]);
  const [selectedToken, setSelectedToken] = useState<TokenRow | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [name, setName] = useState("");
  const [scope, setScope] = useState<"fortlev" | "construction" | "both">("both");
  const [duration, setDuration] = useState<"7" | "15" | "30" | "custom">("7");
  const [customExpireAt, setCustomExpireAt] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [lastCreatedLink, setLastCreatedLink] = useState<string | null>(null);

  const tokenMetrics = useMemo(() => {
    const grouped = new Map<string, { accesses: number; created: number; last: string | null }>();
    for (const t of tokens) grouped.set(t.id, { accesses: 0, created: 0, last: t.last_access_at });
    for (const l of logs) {
      const row = grouped.get((l as any).token_id ?? "");
      if (!row) continue;
      if (l.action === "access") row.accesses += 1;
      if (l.action === "created_quotation") row.created += 1;
      if (!row.last || new Date(l.created_at).getTime() > new Date(row.last).getTime()) row.last = l.created_at;
    }
    return grouped;
  }, [tokens, logs]);

  const loadData = async () => {
    if (!activeStoreId) return;
    setLoading(true);
    const [{ data: tokenRows, error: tokenErr }, { data: logRows }] = await Promise.all([
      cloud
        .from("quotation_access_tokens")
        .select("id,store_id,name,token_preview,token,status,access_scope,expires_at,created_at,last_access_at,uses_count,max_uses")
        .eq("store_id", activeStoreId)
        .order("created_at", { ascending: false }),
      cloud
        .from("token_logs")
        .select("id,token_id,action,ip,quotation_type,quotation_id,created_at")
        .eq("store_id", activeStoreId)
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);

    if (tokenErr) {
      toast({ title: "Erro ao carregar tokens", description: tokenErr.message, variant: "destructive" });
    }

    setTokens((tokenRows as TokenRow[]) ?? []);
    setLogs((logRows as TokenLog[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [activeStoreId]);

  const createToken = async () => {
    if (!activeStoreId || name.trim().length < 2) {
      toast({ title: "Nome inválido", variant: "destructive" });
      return;
    }
    setCreating(true);
    const raw = `${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
    const expiresAt =
      duration === "custom"
        ? customExpireAt
        : new Date(Date.now() + Number(duration) * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await cloud.rpc("create_quotation_access_token", {
      _store_id: activeStoreId,
      _name: name.trim(),
      _raw_token: raw,
      _access_scope: scope,
      _expires_at: expiresAt,
      _starts_at: new Date().toISOString(),
      _max_uses: maxUses.trim() ? Number(maxUses) : null,
    });

    if (error) {
      toast({ title: "Erro ao criar token", description: error.message, variant: "destructive" });
      setCreating(false);
      return;
    }

    const link = `${window.location.origin}/orcamento-publico?token=${encodeURIComponent(raw)}`;
    setLastCreatedLink(link);
    toast({ title: "Token criado", description: "Link público pronto para uso" });
    setCreateOpen(false);
    setName("");
    setScope("both");
    setDuration("7");
    setCustomExpireAt("");
    setMaxUses("");
    await loadData();
    setCreating(false);
  };

  const revokeToken = async (id: string) => {
    const { error } = await cloud.rpc("revoke_quotation_access_token", { _token_id: id });
    if (error) {
      toast({ title: "Erro ao revogar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Token revogado" });
    await loadData();
  };

  const copyTokenLink = async (token: TokenRow) => {
    if (!token.token) {
      toast({ title: "Token completo indisponível", variant: "destructive" });
      return;
    }
    const link = `${window.location.origin}/orcamento-publico?token=${encodeURIComponent(token.token)}`;
    await navigator.clipboard.writeText(link);
    toast({ title: "Link copiado" });
  };

  const openLogs = (token: TokenRow) => {
    setSelectedToken(token);
    setLogsOpen(true);
  };

  const selectedLogs = useMemo(() => {
    if (!selectedToken) return [];
    return logs.filter((l: any) => l.token_id === selectedToken.id);
  }, [logs, selectedToken]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>🔐 Tokens de Acesso</CardTitle>
          <Button onClick={() => setCreateOpen(true)}>
            <ShieldPlus className="h-4 w-4 mr-2" />
            Criar Token
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground py-8">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome do Token</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Último uso</TableHead>
                  <TableHead>Total acessos</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((t) => {
                  const s = getTokenStatus(t);
                  const metric = tokenMetrics.get(t.id);
                  return (
                    <TableRow key={t.id}>
                      <TableCell>{t.name}</TableCell>
                      <TableCell>{t.token_preview}</TableCell>
                      <TableCell>
                        {s === "active" ? (
                          <Badge>ativo</Badge>
                        ) : s === "expired" ? (
                          <Badge variant="secondary">expirado</Badge>
                        ) : (
                          <Badge variant="destructive">revogado</Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(t.expires_at)}</TableCell>
                      <TableCell>{formatDate(t.created_at)}</TableCell>
                      <TableCell>{formatDate(metric?.last ?? t.last_access_at)}</TableCell>
                      <TableCell>{metric?.accesses ?? t.uses_count}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => copyTokenLink(t)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openLogs(t)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => revokeToken(t.id)}>
                            <Ban className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Token</DialogTitle>
            <DialogDescription>Gera um link público temporário para orçamento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do token</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Representante João" />
            </div>
            <div className="space-y-2">
              <Label>Tipo de acesso</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button variant={scope === "fortlev" ? "default" : "outline"} onClick={() => setScope("fortlev")}>Fortlev</Button>
                <Button variant={scope === "construction" ? "default" : "outline"} onClick={() => setScope("construction")}>Construção</Button>
                <Button variant={scope === "both" ? "default" : "outline"} onClick={() => setScope("both")}>Ambos</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Duração</Label>
              <div className="grid grid-cols-4 gap-2">
                <Button variant={duration === "7" ? "default" : "outline"} onClick={() => setDuration("7")}>7d</Button>
                <Button variant={duration === "15" ? "default" : "outline"} onClick={() => setDuration("15")}>15d</Button>
                <Button variant={duration === "30" ? "default" : "outline"} onClick={() => setDuration("30")}>30d</Button>
                <Button variant={duration === "custom" ? "default" : "outline"} onClick={() => setDuration("custom")}>Custom</Button>
              </div>
              {duration === "custom" && (
                <Input type="datetime-local" value={customExpireAt} onChange={(e) => setCustomExpireAt(e.target.value)} />
              )}
            </div>
            <div className="space-y-2">
              <Label>Limite de acessos (opcional)</Label>
              <Input value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="Ex: 100" inputMode="numeric" />
            </div>
            {lastCreatedLink && (
              <div className="rounded-lg border border-border p-3 text-sm break-all">{lastCreatedLink}</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={createToken} disabled={creating}>{creating ? "Criando..." : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Logs do Token</DialogTitle>
            <DialogDescription>{selectedToken?.name}</DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Tipo de orçamento</TableHead>
                <TableHead>ID do orçamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedLogs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{formatDate(l.created_at)}</TableCell>
                  <TableCell>{l.ip ?? "—"}</TableCell>
                  <TableCell>{l.action}</TableCell>
                  <TableCell>{l.quotation_type ?? "—"}</TableCell>
                  <TableCell>{l.quotation_id ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}