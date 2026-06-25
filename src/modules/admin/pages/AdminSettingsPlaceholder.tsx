import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Navigate } from "react-router-dom";
import { useStore } from "@/contexts/StoreContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Copy, KeyRound, Plus, Trash2, Webhook } from "lucide-react";

export function AdminSettingsFrete() {
  return (
    <Card className="rounded-2xl">
      <CardHeader><CardTitle>Frete</CardTitle></CardHeader>
      <CardContent className="text-sm text-muted-foreground">Configurações de frete em breve.</CardContent>
    </Card>
  );
}

export function AdminSettingsPagamentos() {
  const { routes } = useStore();
  return <Navigate to={routes.adminPath("/configuracoes/pagamentos/gateways")} replace />;
}

export function AdminSettingsIdentidade() {
  return (
    <Card className="rounded-2xl">
      <CardHeader><CardTitle>Identidade da Loja</CardTitle></CardHeader>
      <CardContent className="text-sm text-muted-foreground">Personalização da identidade em breve.</CardContent>
    </Card>
  );
}

type ApiKey = { id: string; name: string; key: string; active: boolean; last_used_at: string | null; created_at: string };
type WebHook = { id: string; event: string; url: string; secret: string; active: boolean };

export function AdminSettingsIntegracoes() {
  const { activeStoreId } = useStore();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [hooks, setHooks] = useState<WebHook[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [newHookUrl, setNewHookUrl] = useState("");
  const [newHookEvent, setNewHookEvent] = useState("quotation.created");
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!activeStoreId) return;
    const [{ data: k }, { data: h }] = await Promise.all([
      supabase.from("api_keys").select("id,name,key,active,last_used_at,created_at").eq("store_id", activeStoreId).order("created_at", { ascending: false }),
      supabase.from("api_webhooks").select("id,event,url,secret,active").eq("store_id", activeStoreId).order("created_at", { ascending: false }),
    ]);
    setKeys((k ?? []) as ApiKey[]);
    setHooks((h ?? []) as WebHook[]);
  }

  useEffect(() => { load(); }, [activeStoreId]);

  async function createKey() {
    if (!activeStoreId || !newKeyName.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("api_keys").insert({ store_id: activeStoreId, name: newKeyName.trim() } as any);
    setLoading(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setNewKeyName("");
    toast({ title: "Chave criada" });
    load();
  }

  async function deleteKey(id: string) {
    if (!confirm("Revogar esta chave? Bots usando ela perderão acesso.")) return;
    await supabase.from("api_keys").delete().eq("id", id);
    load();
  }

  async function createHook() {
    if (!activeStoreId || !newHookUrl.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("api_webhooks").insert({ store_id: activeStoreId, event: newHookEvent, url: newHookUrl.trim() } as any);
    setLoading(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setNewHookUrl("");
    toast({ title: "Webhook criado" });
    load();
  }

  async function deleteHook(id: string) {
    if (!confirm("Remover webhook?")) return;
    await supabase.from("api_webhooks").delete().eq("id", id);
    load();
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado" });
  }

  if (!activeStoreId) {
    return <Card className="rounded-2xl"><CardContent className="p-6 text-sm text-muted-foreground">Selecione uma loja.</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> API Keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Use estas chaves no header <code className="bg-muted px-1 rounded">x-api-key</code> ao chamar a API de bots em <code className="bg-muted px-1 rounded">/functions/v1/api-quotation</code>.
          </p>
          <div className="flex gap-2">
            <Input placeholder="Nome (ex: Bot WhatsApp)" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
            <Button onClick={createKey} disabled={loading || !newKeyName.trim()}>
              <Plus className="h-4 w-4 mr-1" /> Criar
            </Button>
          </div>
          <div className="space-y-2">
            {keys.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma chave criada.</p>}
            {keys.map((k) => (
              <div key={k.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{k.name}</span>
                    {k.active ? <Badge variant="secondary" className="text-[10px]">ativa</Badge> : <Badge variant="outline" className="text-[10px]">inativa</Badge>}
                  </div>
                  <code className="text-[11px] text-muted-foreground block truncate">{k.key}</code>
                </div>
                <Button variant="ghost" size="icon" onClick={() => copy(k.key)}><Copy className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => deleteKey(k.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Webhook className="h-4 w-4" /> Webhooks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">Receba notificações HTTP quando eventos acontecem. Header de validação: <code className="bg-muted px-1 rounded">X-Webhook-Secret</code>.</p>
          <div className="flex gap-2">
            <select className="h-9 px-3 rounded-md border bg-background text-sm" value={newHookEvent} onChange={(e) => setNewHookEvent(e.target.value)}>
              <option value="quotation.created">quotation.created</option>
              <option value="quotation.updated">quotation.updated</option>
              <option value="order.created">order.created</option>
            </select>
            <Input placeholder="https://seu-bot.com/webhook" value={newHookUrl} onChange={(e) => setNewHookUrl(e.target.value)} />
            <Button onClick={createHook} disabled={loading || !newHookUrl.trim()}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          </div>
          <div className="space-y-2">
            {hooks.length === 0 && <p className="text-xs text-muted-foreground">Nenhum webhook configurado.</p>}
            {hooks.map((h) => (
              <div key={h.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">{h.event}</Badge>
                    {h.active && <Badge variant="outline" className="text-[10px] text-emerald-600">ativo</Badge>}
                  </div>
                  <p className="text-xs truncate">{h.url}</p>
                  <code className="text-[10px] text-muted-foreground">secret: {h.secret}</code>
                </div>
                <Button variant="ghost" size="icon" onClick={() => copy(h.secret)}><Copy className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => deleteHook(h.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Documentação da API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div>
            <p className="font-semibold mb-1">Endpoints</p>
            <ul className="space-y-1 font-mono text-[11px] text-muted-foreground">
              <li><span className="text-emerald-600 font-bold">POST</span> /functions/v1/api-quotation/analyze</li>
              <li><span className="text-emerald-600 font-bold">POST</span> /functions/v1/api-quotation/generate</li>
              <li><span className="text-blue-600 font-bold">GET</span>&nbsp;&nbsp;/functions/v1/api-quotation/&#123;id&#125;</li>
              <li><span className="text-blue-600 font-bold">GET</span>&nbsp;&nbsp;/functions/v1/api-quotation/&#123;id&#125;/pdf</li>
              <li><span className="text-emerald-600 font-bold">POST</span> /functions/v1/api-quotation/validate-token</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-1">Autenticação</p>
            <p className="text-muted-foreground">Envie sua chave no header <code className="bg-muted px-1 rounded">x-api-key</code>. Cada chave é vinculada à loja e só acessa dados dela.</p>
          </div>
          <div>
            <p className="font-semibold mb-1">Exemplo (curl)</p>
            <pre className="bg-muted/50 p-3 rounded text-[10px] overflow-x-auto">
{`curl -X POST \\
  https://flkionbmkuqgkudjjuqk.supabase.co/functions/v1/api-quotation/analyze \\
  -H "x-api-key: SUA_CHAVE_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "João Silva, 2 caixas 1000L"}'`}
            </pre>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 h-7 text-[11px]"
              onClick={() => copy(`curl -X POST https://flkionbmkuqgkudjjuqk.supabase.co/functions/v1/api-quotation/analyze -H "x-api-key: SUA_CHAVE" -H "Content-Type: application/json" -d '{"text":"João Silva, 2 caixas 1000L"}'`)}
            >
              <Copy className="h-3 w-3 mr-1" /> Copiar exemplo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
