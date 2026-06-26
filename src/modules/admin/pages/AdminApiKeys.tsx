import { useEffect, useMemo, useState } from "react";
import { cloud } from "@/lib/cloud";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Copy, KeyRound, Plus, ShieldOff, AlertCircle } from "lucide-react";

type ApiKey = {
  id: string;
  store_id: string;
  name: string;
  key_prefix: string | null;
  permissions: string[];
  active: boolean;
  revoked_at: string | null;
  expires_at: string | null;
  starts_at: string;
  quota_limit: number;
  quota_used: number;
  cost_limit_brl: number;
  cost_used_brl: number;
  cost_per_call_brl: number;
  last_used_at: string | null;
  created_at: string;
};

const SCOPES = [
  { value: "quotation:read", label: "Ler orçamentos" },
  { value: "quotation:create", label: "Criar orçamentos" },
  { value: "danfe:read", label: "Baixar DANFE/PDF" },
  { value: "product:read", label: "Ler produtos e imagens" },
];

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

export default function AdminApiKeys() {
  const { activeStoreId, label } = useStore();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);

  // form
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["quotation:read"]);
  const [expiresDays, setExpiresDays] = useState<number>(30);
  const [quotaLimit, setQuotaLimit] = useState<number>(10000);
  const [costLimit, setCostLimit] = useState<number>(0);
  const [costPerCall, setCostPerCall] = useState<number>(0);

  const load = async () => {
    setLoading(true);
    let q = cloud.from("api_keys").select("*").order("created_at", { ascending: false });
    if (activeStoreId) q = q.eq("store_id", activeStoreId);
    const { data, error } = await q;
    if (error) toast.error("Erro ao carregar chaves: " + error.message);
    setKeys((data ?? []) as ApiKey[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStoreId]);

  const create = async () => {
    if (!activeStoreId) return toast.error("Selecione uma loja primeiro");
    if (!name.trim()) return toast.error("Nome obrigatório");
    if (scopes.length === 0) return toast.error("Selecione ao menos um escopo");
    setCreating(true);

    const expires_at = expiresDays > 0 ? new Date(Date.now() + expiresDays * 86400000).toISOString() : null;
    const { data, error } = await cloud
      .from("api_keys")
      .insert({
        store_id: activeStoreId,
        name: name.trim(),
        permissions: scopes,
        expires_at,
        quota_limit: quotaLimit,
        cost_limit_brl: costLimit,
        cost_per_call_brl: costPerCall,
        active: true,
      })
      .select("*")
      .single();
    setCreating(false);
    if (error) return toast.error(error.message);

    setNewKeyValue((data as any).key);
    setName("");
    setScopes(["quotation:read"]);
    setExpiresDays(30);
    setQuotaLimit(10000);
    setCostLimit(0);
    setCostPerCall(0);
    load();
  };

  const revoke = async (id: string) => {
    if (!confirm("Revogar esta chave? Os clientes que a usam perderão acesso imediatamente.")) return;
    const { error } = await cloud
      .from("api_keys")
      .update({ active: false, revoked_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Chave revogada");
    load();
  };

  const toggleScope = (s: string) =>
    setScopes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const statusOf = (k: ApiKey) => {
    if (k.revoked_at || !k.active) return { label: "Revogada", variant: "destructive" as const };
    if (k.expires_at && new Date(k.expires_at) <= new Date()) return { label: "Expirada", variant: "secondary" as const };
    if (k.quota_limit > 0 && k.quota_used >= k.quota_limit) return { label: "Quota esgotada", variant: "secondary" as const };
    if (k.cost_limit_brl > 0 && k.cost_used_brl >= k.cost_limit_brl) return { label: "Custo esgotado", variant: "secondary" as const };
    return { label: "Ativa", variant: "default" as const };
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <KeyRound size={22} /> Chaves de API
          </h1>
          <p className="text-sm text-muted-foreground">
            {activeStoreId ? `Loja: ${label}` : "Selecione uma loja"} · Gere chaves com prazo, quota e teto de custo
          </p>
        </div>
        <Button onClick={() => { setOpen(true); setNewKeyValue(null); }} disabled={!activeStoreId}>
          <Plus size={16} className="mr-2" /> Nova chave
        </Button>
      </div>

      {!activeStoreId && (
        <Card>
          <CardContent className="p-6 flex items-center gap-3 text-muted-foreground">
            <AlertCircle size={20} /> Selecione uma loja no menu para gerenciar as chaves dela.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {loading && <div className="text-sm text-muted-foreground">Carregando...</div>}
        {!loading && keys.length === 0 && activeStoreId && (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhuma chave criada ainda.</CardContent></Card>
        )}
        {keys.map((k) => {
          const st = statusOf(k);
          const quotaPct = k.quota_limit > 0 ? Math.min(100, (k.quota_used / k.quota_limit) * 100) : 0;
          const costPct = k.cost_limit_brl > 0 ? Math.min(100, (k.cost_used_brl / k.cost_limit_brl) * 100) : 0;
          return (
            <Card key={k.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {k.name}
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </CardTitle>
                    <code className="text-xs text-muted-foreground">{k.key_prefix}…</code>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => revoke(k.id)} disabled={!k.active}>
                    <ShieldOff size={14} className="mr-1" /> Revogar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-1">
                  {k.permissions.map((p) => <Badge key={p} variant="outline">{p}</Badge>)}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className="text-muted-foreground mb-1">Requisições</div>
                    <div>{k.quota_used.toLocaleString()} / {k.quota_limit > 0 ? k.quota_limit.toLocaleString() : "∞"}</div>
                    <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${quotaPct}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Custo</div>
                    <div>{fmtBRL(k.cost_used_brl)} / {k.cost_limit_brl > 0 ? fmtBRL(k.cost_limit_brl) : "sem limite"}</div>
                    <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${costPct}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Validade</div>
                    <div>{k.expires_at ? new Date(k.expires_at).toLocaleString("pt-BR") : "Sem expiração"}</div>
                    <div className="text-muted-foreground mt-1">
                      {k.last_used_at ? `Último uso: ${new Date(k.last_used_at).toLocaleString("pt-BR")}` : "Nunca usada"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setNewKeyValue(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{newKeyValue ? "Chave criada" : "Nova chave de API"}</DialogTitle>
          </DialogHeader>

          {newKeyValue ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Copie agora — esta chave <strong>não será mostrada novamente</strong>.
              </p>
              <div className="flex items-center gap-2 p-3 bg-muted rounded font-mono text-xs break-all">
                {newKeyValue}
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  navigator.clipboard.writeText(newKeyValue);
                  toast.success("Copiada!");
                }}
              >
                <Copy size={14} className="mr-2" /> Copiar
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Nome / descrição</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Integração ERP cliente X" />
              </div>
              <div>
                <Label>Escopos</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {SCOPES.map((s) => (
                    <label key={s.value} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={scopes.includes(s.value)} onCheckedChange={() => toggleScope(s.value)} />
                      {s.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Validade (dias)</Label>
                  <Input type="number" value={expiresDays} onChange={(e) => setExpiresDays(parseInt(e.target.value) || 0)} />
                  <p className="text-xs text-muted-foreground mt-1">0 = sem expiração</p>
                </div>
                <div>
                  <Label>Quota mensal (req)</Label>
                  <Input type="number" value={quotaLimit} onChange={(e) => setQuotaLimit(parseInt(e.target.value) || 0)} />
                  <p className="text-xs text-muted-foreground mt-1">0 = ilimitado</p>
                </div>
                <div>
                  <Label>Teto de custo (R$)</Label>
                  <Input type="number" step="0.01" value={costLimit} onChange={(e) => setCostLimit(parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>Custo por chamada (R$)</Label>
                  <Input type="number" step="0.0001" value={costPerCall} onChange={(e) => setCostPerCall(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {newKeyValue ? (
              <Button onClick={() => { setOpen(false); setNewKeyValue(null); }}>Fechar</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={create} disabled={creating}>{creating ? "Gerando..." : "Gerar chave"}</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
