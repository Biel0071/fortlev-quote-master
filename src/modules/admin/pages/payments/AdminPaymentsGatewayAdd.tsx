import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/contexts/StoreContext";

const METHODS = ["pix", "card", "boleto"];

export default function AdminPaymentsGatewayAdd() {
  const nav = useNavigate();
  const { routes } = useStore();
  const [params] = useSearchParams();
  const editId = params.get("edit");

  const { data: existing } = useQuery({
    queryKey: ["payment-gateway-edit", editId],
    enabled: !!editId,
    queryFn: async () => {
      const { data } = await supabase.from("payment_gateways").select("*").eq("id", editId!).single();
      return data;
    },
  });

  const [form, setForm] = useState({
    name: "",
    provider: "custom",
    webhook_url: "",
    status: "inactive",
    api_url: "",
    rate_percent: "0",
    rate_fixed: "0",
    mode: "production",
    supported_methods: ["pix", "card", "boleto"] as string[],
    supported_currencies: ["BRL"],
  });
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name || "",
        provider: existing.provider || "custom",
        webhook_url: existing.webhook_url || "",
        status: existing.status || "inactive",
        api_url: (existing as any).api_url || "",
        rate_percent: String((existing as any).rate_percent || 0),
        rate_fixed: String((existing as any).rate_fixed || 0),
        mode: (existing as any).mode || "production",
        supported_methods: (existing as any).supported_methods || ["pix", "card", "boleto"],
        supported_currencies: (existing as any).supported_currencies || ["BRL"],
      });
    }
  }, [existing]);

  const toggleMethod = (m: string) => {
    setForm((prev) => ({
      ...prev,
      supported_methods: prev.supported_methods.includes(m)
        ? prev.supported_methods.filter((x) => x !== m)
        : [...prev.supported_methods, m],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Nome obrigatório"); return; }
    setSaving(true);
    const payload: any = {
      name: form.name.trim(),
      provider: form.provider,
      webhook_url: form.webhook_url || null,
      status: form.status,
      config_json: {},
      api_url: form.api_url || null,
      rate_percent: Number(form.rate_percent) || 0,
      rate_fixed: Number(form.rate_fixed) || 0,
      mode: form.mode,
      supported_methods: form.supported_methods,
      supported_currencies: form.supported_currencies,
    };
    if (apiKey) payload.api_key_encrypted = apiKey;
    if (secretKey) payload.secret_key_encrypted = secretKey;

    if (editId) {
      const { error } = await supabase.from("payment_gateways").update(payload).eq("id", editId);
      if (error) { toast.error("Erro ao atualizar"); setSaving(false); return; }
      toast.success("Gateway atualizado");
    } else {
      const { error } = await supabase.from("payment_gateways").insert(payload);
      if (error) { toast.error("Erro ao criar"); setSaving(false); return; }
      toast.success("Gateway criado");
    }
    setSaving(false);
    nav(routes.adminPath("/configuracoes/pagamentos/gateways"));
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <Button variant="ghost" size="sm" onClick={() => nav(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
      </Button>

      <h1 className="text-2xl font-bold">{editId ? "Editar Gateway" : "Adicionar Gateway"}</h1>

      <Card>
        <CardHeader><CardTitle className="text-sm">Configuração</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: MercadoPago" />
            </div>
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={form.provider} onValueChange={(v) => setForm({ ...form, provider: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="mercadopago">MercadoPago</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="pagseguro">PagSeguro</SelectItem>
                  <SelectItem value="asaas">Asaas</SelectItem>
                  <SelectItem value="cielo">Cielo</SelectItem>
                  <SelectItem value="rede">Rede</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>API URL</Label>
            <Input value={form.api_url} onChange={(e) => setForm({ ...form, api_url: e.target.value })} placeholder="https://api.gateway.com/v1" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Sua API Key" />
            </div>
            <div className="space-y-2">
              <Label>Secret Key</Label>
              <Input type="password" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} placeholder="Sua Secret Key" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <Input value={form.webhook_url} onChange={(e) => setForm({ ...form, webhook_url: e.target.value })} placeholder="https://..." />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Taxa (%)</Label>
              <Input value={form.rate_percent} onChange={(e) => setForm({ ...form, rate_percent: e.target.value })} type="number" step="0.01" />
            </div>
            <div className="space-y-2">
              <Label>Taxa fixa (R$)</Label>
              <Input value={form.rate_fixed} onChange={(e) => setForm({ ...form, rate_fixed: e.target.value })} type="number" step="0.01" />
            </div>
            <div className="space-y-2">
              <Label>Modo</Label>
              <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Produção</SelectItem>
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Métodos suportados</Label>
            <div className="flex gap-4">
              {METHODS.map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm capitalize">
                  <Checkbox checked={form.supported_methods.includes(m)} onCheckedChange={() => toggleMethod(m)} />
                  {m === "card" ? "Cartão" : m === "boleto" ? "Boleto" : "PIX"}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="sandbox">Sandbox</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            <Save className="h-4 w-4 mr-2" /> {saving ? "Salvando..." : "Salvar Gateway"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
