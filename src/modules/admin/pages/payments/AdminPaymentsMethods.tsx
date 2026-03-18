import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { QrCode, CreditCard, Receipt, Save } from "lucide-react";
import { toast } from "sonner";

export default function AdminPaymentsMethods() {
  const [pix, setPix] = useState({ enabled: true, expiration: "30" });
  const [card, setCard] = useState({ enabled: true, maxInstallments: "12", interestRate: "1.99" });
  const [boleto, setBoleto] = useState({ enabled: true, daysToExpire: "3" });

  const handleSave = () => {
    toast.success("Configurações salvas");
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Métodos de Pagamento</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><QrCode className="h-4 w-4" /> PIX</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Ativo</Label>
              <Switch checked={pix.enabled} onCheckedChange={(v) => setPix({ ...pix, enabled: v })} />
            </div>
            <div className="space-y-2">
              <Label>Expiração (min)</Label>
              <Input value={pix.expiration} onChange={(e) => setPix({ ...pix, expiration: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><CreditCard className="h-4 w-4" /> Cartão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Ativo</Label>
              <Switch checked={card.enabled} onCheckedChange={(v) => setCard({ ...card, enabled: v })} />
            </div>
            <div className="space-y-2">
              <Label>Máx. parcelas</Label>
              <Input value={card.maxInstallments} onChange={(e) => setCard({ ...card, maxInstallments: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Juros (% a.m.)</Label>
              <Input value={card.interestRate} onChange={(e) => setCard({ ...card, interestRate: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Receipt className="h-4 w-4" /> Boleto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Ativo</Label>
              <Switch checked={boleto.enabled} onCheckedChange={(v) => setBoleto({ ...boleto, enabled: v })} />
            </div>
            <div className="space-y-2">
              <Label>Dias para vencer</Label>
              <Input value={boleto.daysToExpire} onChange={(e) => setBoleto({ ...boleto, daysToExpire: e.target.value })} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Button onClick={handleSave}>
        <Save className="h-4 w-4 mr-2" /> Salvar configurações
      </Button>
    </div>
  );
}
