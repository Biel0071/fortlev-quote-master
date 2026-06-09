import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/contexts/StoreContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

export default function AdminQuotationModels() {
  const { activeStoreId } = useStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [budgetConfig, setBudgetConfig] = useState({
    logo: "",
    primaryColor: "#004a97",
    secondaryColor: "#e71212",
    headerText: "ORÇAMENTO DE PRODUTOS",
    observations: "VALIDADE P/ TROCA 5 DIAS * PRAZO MÁXIMO P/ RETIRADA 30 DIAS",
    footerText: "Qualidade em primeiro lugar",
    showSignature: true
  });

  const [invoiceConfig, setInvoiceConfig] = useState({
    paperWidth: "80mm",
    headerText: "",
    footerText: "OBRIGADO E VOLTE SEMPRE!",
    defaultSeller: "",
    warrantyText: "Recebi a(s) mercadoria(s) acima descrita(s), concordando plenamente com os prazos e condições de garantia."
  });

  useEffect(() => {
    if (!activeStoreId) return;

    async function loadModels() {
      setLoading(true);
      const { data, error } = await supabase
        .from("store_models")
        .select("*")
        .eq("store_id", activeStoreId);

      if (!error && data) {
        const budget = data.find(m => m.model_type === "budget");
        if (budget) setBudgetConfig(prev => ({ ...prev, ...(budget.config as any) }));

        const invoice = data.find(m => m.model_type === "invoice");
        if (invoice) setInvoiceConfig(prev => ({ ...prev, ...(invoice.config as any) }));
      }
      setLoading(false);
    }

    loadModels();
  }, [activeStoreId]);

  const handleSave = async (type: "budget" | "invoice") => {
    if (!activeStoreId) return;
    setSaving(true);

    const config = type === "budget" ? budgetConfig : invoiceConfig;

    const { error } = await supabase
      .from("store_models")
      .upsert({
        store_id: activeStoreId,
        model_type: type,
        config: config as any,
        active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: "store_id, model_type" });

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Modelo salvo com sucesso!" });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="budget" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="budget">Modelo de Orçamento</TabsTrigger>
          <TabsTrigger value="invoice">Modelo de Nota</TabsTrigger>
        </TabsList>

        <TabsContent value="budget" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuração do Orçamento</CardTitle>
              <CardDescription>Personalize o visual do PDF/PNG gerado para seus orçamentos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cor Primária</Label>
                  <div className="flex gap-2">
                    <Input type="color" value={budgetConfig.primaryColor} onChange={e => setBudgetConfig({...budgetConfig, primaryColor: e.target.value})} className="w-12 p-1" />
                    <Input value={budgetConfig.primaryColor} onChange={e => setBudgetConfig({...budgetConfig, primaryColor: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cor de Destaque (Total)</Label>
                  <div className="flex gap-2">
                    <Input type="color" value={budgetConfig.secondaryColor} onChange={e => setBudgetConfig({...budgetConfig, secondaryColor: e.target.value})} className="w-12 p-1" />
                    <Input value={budgetConfig.secondaryColor} onChange={e => setBudgetConfig({...budgetConfig, secondaryColor: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Título do Documento</Label>
                <Input value={budgetConfig.headerText} onChange={e => setBudgetConfig({...budgetConfig, headerText: e.target.value})} />
              </div>

              <div className="space-y-2">
                <Label>Observações Padrão</Label>
                <Textarea rows={3} value={budgetConfig.observations} onChange={e => setBudgetConfig({...budgetConfig, observations: e.target.value})} />
              </div>

              <div className="space-y-2">
                <Label>Rodapé / Slogan</Label>
                <Input value={budgetConfig.footerText} onChange={e => setBudgetConfig({...budgetConfig, footerText: e.target.value})} />
              </div>

              <Button onClick={() => handleSave("budget")} disabled={saving} className="w-full md:w-auto">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar Configurações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoice" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuração da Nota de Entrega (Térmica)</CardTitle>
              <CardDescription>Personalize a nota impressa em impressoras térmicas de 80mm.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Largura do Papel</Label>
                  <Input value={invoiceConfig.paperWidth} onChange={e => setInvoiceConfig({...invoiceConfig, paperWidth: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Vendedor Padrão</Label>
                  <Input value={invoiceConfig.defaultSeller} onChange={e => setInvoiceConfig({...invoiceConfig, defaultSeller: e.target.value})} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Texto de Garantia / Recebimento</Label>
                <Textarea rows={3} value={invoiceConfig.warrantyText} onChange={e => setInvoiceConfig({...invoiceConfig, warrantyText: e.target.value})} />
              </div>

              <div className="space-y-2">
                <Label>Rodapé da Nota</Label>
                <Input value={invoiceConfig.footerText} onChange={e => setInvoiceConfig({...invoiceConfig, footerText: e.target.value})} />
              </div>

              <Button onClick={() => handleSave("invoice")} disabled={saving} className="w-full md:w-auto">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar Configurações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
