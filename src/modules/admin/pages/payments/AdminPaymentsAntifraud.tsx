import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Save } from "lucide-react";
import { toast } from "sonner";

export default function AdminPaymentsAntifraud() {
  const [rules, setRules] = useState({
    blockIp: true,
    blockCard: true,
    maxAttempts: "5",
    minScore: "30",
    blacklistedIps: "",
    blacklistedCards: "",
  });

  const handleSave = () => { toast.success("Regras de antifraude salvas"); };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6 text-primary" /> Antifraude</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Regras</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between"><Label>Bloquear IP suspeito</Label><Switch checked={rules.blockIp} onCheckedChange={(v) => setRules({ ...rules, blockIp: v })} /></div>
            <div className="flex items-center justify-between"><Label>Bloquear cartão suspeito</Label><Switch checked={rules.blockCard} onCheckedChange={(v) => setRules({ ...rules, blockCard: v })} /></div>
            <div className="space-y-2"><Label>Limite de tentativas</Label><Input value={rules.maxAttempts} onChange={(e) => setRules({ ...rules, maxAttempts: e.target.value })} /></div>
            <div className="space-y-2"><Label>Score mínimo</Label><Input value={rules.minScore} onChange={(e) => setRules({ ...rules, minScore: e.target.value })} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Lista Negra</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>IPs bloqueados (um por linha)</Label><Textarea rows={4} value={rules.blacklistedIps} onChange={(e) => setRules({ ...rules, blacklistedIps: e.target.value })} placeholder="192.168.1.1" /></div>
            <div className="space-y-2"><Label>Cartões bloqueados (últimos 4 dígitos)</Label><Textarea rows={4} value={rules.blacklistedCards} onChange={(e) => setRules({ ...rules, blacklistedCards: e.target.value })} placeholder="1234" /></div>
          </CardContent>
        </Card>
      </div>
      <Button onClick={handleSave}><Save className="h-4 w-4 mr-2" /> Salvar regras</Button>
    </div>
  );
}
