import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

export default function AdminPaymentsGatewayAdd() {
  const nav = useNavigate();
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
    name: existing?.name || "",
    provider: existing?.provider || "custom",
    webhook_url: existing?.webhook_url || "",
    status: existing?.status || "inactive",
  });
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync form when existing loads
  if (existing && !form.name && existing.name) {
    setForm({ name: existing.name, provider: existing.provider, webhook_url: existing.webhook_url || "", status: existing.status });
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Nome obrigatório"); return; }
    setSaving(true);
    const payload: any = {
      name: form.name.trim(),
      provider: form.provider,
      webhook_url: form.webhook_url || null,
      status: form.status,
      config_json: {},
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
    nav("/admin/payments/gateways");
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
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: MercadoPago, Stripe" />
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
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>API Key</Label>
            <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Sua API Key" />
          </div>
          <div className="space-y-2">
            <Label>Secret Key</Label>
            <Input type="password" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} placeholder="Sua Secret Key" />
          </div>
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <Input value={form.webhook_url} onChange={(e) => setForm({ ...form, webhook_url: e.target.value })} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label>Modo</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo (Produção)</SelectItem>
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
