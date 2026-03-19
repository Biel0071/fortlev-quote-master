import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { QrCode, CreditCard, Receipt, Save, Shield, Route, MessageSquare, Zap, Power } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function AdminPaymentsMethods() {
  const [pix, setPix] = useState({
    enabled: true, key: "", expiration: "30", description: "", webhookUrl: "", discount: "5",
  });
  const [card, setCard] = useState({
    enabled: true, maxInstallments: "12", freeInstallments: "3", interestRate: "1.99", autoCapture: true, threeDSecure: false,
  });
  const [boleto, setBoleto] = useState({
    enabled: true, daysToExpire: "3", lateFee: "2", lateInterest: "1", instructions: "",
  });

  const [routingThreshold, setRoutingThreshold] = useState("980");
  const [loadingThreshold, setLoadingThreshold] = useState(true);

  useEffect(() => {
    supabase
      .from("payment_methods_config")
      .select("config_json")
      .eq("method", "routing_threshold")
      .maybeSingle()
      .then(({ data }) => {
        const val = (data?.config_json as any)?.threshold;
        if (typeof val === "number" && val > 0) setRoutingThreshold(String(val));
        setLoadingThreshold(false);
      });
  }, []);

  const handleSaveThreshold = async () => {
    const val = Number(routingThreshold);
    if (!Number.isFinite(val) || val <= 0) {
      toast.error("Informe um valor válido maior que zero.");
      return;
    }

    const { error } = await supabase
      .from("payment_methods_config")
      .update({ config_json: { threshold: val } as any })
      .eq("method", "routing_threshold");

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Limite de roteamento salvo com sucesso!");
    }
  };

  const handleSave = () => { toast.success("Configurações salvas"); };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Métodos de Pagamento</h1>

      {/* Routing threshold card */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Route className="h-4 w-4 text-primary" />
            Roteamento de Pagamento
          </CardTitle>
          <CardDescription>
            Define o valor limite para decidir como o pedido será processado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border bg-background p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Zap className="h-4 w-4 text-green-600" />
                Pedidos até o limite
              </div>
              <p className="text-xs text-muted-foreground">
                Geram cobrança PIX automática via gateway (AllowPay).
                O cliente recebe o QR Code na hora.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                Pedidos acima do limite
              </div>
              <p className="text-xs text-muted-foreground">
                Redirecionados para WhatsApp para fechamento manual
                com um consultor.
              </p>
            </div>
          </div>

          <div className="flex items-end gap-3">
            <div className="space-y-2 flex-1 max-w-xs">
              <Label>Valor limite (R$)</Label>
              <Input
                value={routingThreshold}
                onChange={(e) => setRoutingThreshold(e.target.value)}
                type="number"
                min="1"
                step="10"
                placeholder="980"
                disabled={loadingThreshold}
              />
            </div>
            <Button onClick={handleSaveThreshold} size="sm" disabled={loadingThreshold}>
              <Save className="h-4 w-4 mr-1" /> Salvar limite
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* PIX */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><QrCode className="h-4 w-4 text-primary" /> PIX</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between"><Label>Ativo</Label><Switch checked={pix.enabled} onCheckedChange={(v) => setPix({ ...pix, enabled: v })} /></div>
            <div className="space-y-2"><Label>Chave PIX</Label><Input value={pix.key} onChange={(e) => setPix({ ...pix, key: e.target.value })} placeholder="email@empresa.com" /></div>
            <div className="space-y-2"><Label>Expiração (min)</Label><Input value={pix.expiration} onChange={(e) => setPix({ ...pix, expiration: e.target.value })} type="number" /></div>
            <div className="space-y-2"><Label>Descrição pagamento</Label><Input value={pix.description} onChange={(e) => setPix({ ...pix, description: e.target.value })} placeholder="Pagamento loja" /></div>
            <div className="space-y-2"><Label>Webhook PIX</Label><Input value={pix.webhookUrl} onChange={(e) => setPix({ ...pix, webhookUrl: e.target.value })} placeholder="https://..." /></div>
            <div className="space-y-2"><Label>Desconto PIX (%)</Label><Input value={pix.discount} onChange={(e) => setPix({ ...pix, discount: e.target.value })} type="number" /></div>
          </CardContent>
        </Card>

        {/* Cartão */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> Cartão</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between"><Label>Ativo</Label><Switch checked={card.enabled} onCheckedChange={(v) => setCard({ ...card, enabled: v })} /></div>
            <div className="space-y-2"><Label>Máx. parcelas</Label><Input value={card.maxInstallments} onChange={(e) => setCard({ ...card, maxInstallments: e.target.value })} type="number" /></div>
            <div className="space-y-2"><Label>Parcelas sem juros</Label><Input value={card.freeInstallments} onChange={(e) => setCard({ ...card, freeInstallments: e.target.value })} type="number" /></div>
            <div className="space-y-2"><Label>Juros parcelado (% a.m.)</Label><Input value={card.interestRate} onChange={(e) => setCard({ ...card, interestRate: e.target.value })} type="number" step="0.01" /></div>
            <div className="flex items-center justify-between"><Label>Captura automática</Label><Switch checked={card.autoCapture} onCheckedChange={(v) => setCard({ ...card, autoCapture: v })} /></div>
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1"><Shield className="h-3 w-3" /> 3D Secure</Label>
              <Switch checked={card.threeDSecure} onCheckedChange={(v) => setCard({ ...card, threeDSecure: v })} />
            </div>
          </CardContent>
        </Card>

        {/* Boleto */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" /> Boleto</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between"><Label>Ativo</Label><Switch checked={boleto.enabled} onCheckedChange={(v) => setBoleto({ ...boleto, enabled: v })} /></div>
            <div className="space-y-2"><Label>Dias p/ vencimento</Label><Input value={boleto.daysToExpire} onChange={(e) => setBoleto({ ...boleto, daysToExpire: e.target.value })} type="number" /></div>
            <div className="space-y-2"><Label>Multa atraso (%)</Label><Input value={boleto.lateFee} onChange={(e) => setBoleto({ ...boleto, lateFee: e.target.value })} type="number" step="0.01" /></div>
            <div className="space-y-2"><Label>Juros atraso (% a.m.)</Label><Input value={boleto.lateInterest} onChange={(e) => setBoleto({ ...boleto, lateInterest: e.target.value })} type="number" step="0.01" /></div>
            <div className="space-y-2"><Label>Instruções</Label><Textarea value={boleto.instructions} onChange={(e) => setBoleto({ ...boleto, instructions: e.target.value })} rows={3} placeholder="Não receber após o vencimento..." /></div>
          </CardContent>
        </Card>
      </div>

      <Button onClick={handleSave}><Save className="h-4 w-4 mr-2" /> Salvar configurações</Button>
    </div>
  );
}
