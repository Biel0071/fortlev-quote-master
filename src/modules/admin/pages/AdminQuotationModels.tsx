import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/contexts/StoreContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, ArrowUp, ArrowDown, Eye, EyeOff } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";

type SectionKey = "header" | "client" | "items" | "totals" | "observations" | "signature" | "footer";

interface BudgetConfig {
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  headerText: string;
  observations: string;
  footerText: string;
  showSignature: boolean;
  logoSize: number;
  titleSize: number;
  bodySize: number;
  spacing: number;
  sections: SectionKey[];
  hiddenSections: SectionKey[];
}

const DEFAULT_SECTIONS: SectionKey[] = ["header", "client", "items", "totals", "observations", "signature", "footer"];

const SECTION_LABELS: Record<SectionKey, string> = {
  header: "Cabeçalho",
  client: "Dados do Cliente",
  items: "Tabela de Itens",
  totals: "Totais",
  observations: "Observações",
  signature: "Assinatura",
  footer: "Rodapé",
};

export default function AdminQuotationModels() {
  const { activeStoreId } = useStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [budgetConfig, setBudgetConfig] = useState<BudgetConfig>({
    logo: "",
    primaryColor: "#004a97",
    secondaryColor: "#e71212",
    headerText: "ORÇAMENTO DE PRODUTOS",
    observations: "VALIDADE P/ TROCA 5 DIAS * PRAZO MÁXIMO P/ RETIRADA 30 DIAS",
    footerText: "Qualidade em primeiro lugar",
    showSignature: true,
    logoSize: 60,
    titleSize: 20,
    bodySize: 12,
    spacing: 12,
    sections: DEFAULT_SECTIONS,
    hiddenSections: [],
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
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from("store_models").select("*").eq("store_id", activeStoreId);
      if (!error && data) {
        const budget = data.find(m => m.model_type === "budget");
        if (budget) {
          const cfg = budget.config as any;
          setBudgetConfig(prev => ({
            ...prev,
            ...cfg,
            sections: Array.isArray(cfg?.sections) && cfg.sections.length ? cfg.sections : DEFAULT_SECTIONS,
            hiddenSections: Array.isArray(cfg?.hiddenSections) ? cfg.hiddenSections : [],
          }));
        }
        const invoice = data.find(m => m.model_type === "invoice");
        if (invoice) setInvoiceConfig(prev => ({ ...prev, ...(invoice.config as any) }));
      }
      setLoading(false);
    })();
  }, [activeStoreId]);

  const handleSave = async (type: "budget" | "invoice") => {
    if (!activeStoreId) return;
    setSaving(true);
    const config = type === "budget" ? budgetConfig : invoiceConfig;
    const { error } = await supabase.from("store_models").upsert({
      store_id: activeStoreId,
      model_type: type,
      config: config as any,
      active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "store_id, model_type" });
    if (error) toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    else toast({ title: "Modelo salvo com sucesso!" });
    setSaving(false);
  };

  const moveSection = (idx: number, dir: -1 | 1) => {
    setBudgetConfig(prev => {
      const s = [...prev.sections];
      const j = idx + dir;
      if (j < 0 || j >= s.length) return prev;
      [s[idx], s[j]] = [s[j], s[idx]];
      return { ...prev, sections: s };
    });
  };

  const toggleSection = (key: SectionKey) => {
    setBudgetConfig(prev => ({
      ...prev,
      hiddenSections: prev.hiddenSections.includes(key)
        ? prev.hiddenSections.filter(k => k !== key)
        : [...prev.hiddenSections, key],
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBudgetConfig(prev => ({ ...prev, logo: reader.result as string }));
    reader.readAsDataURL(file);
  };

  if (loading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="budget" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="budget">Modelo de Orçamento</TabsTrigger>
          <TabsTrigger value="invoice">Modelo de Nota</TabsTrigger>
        </TabsList>

        <TabsContent value="budget" className="pt-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* EDITOR */}
            <Card>
              <CardHeader>
                <CardTitle>Editor Visual</CardTitle>
                <CardDescription>Personalize cores, tamanhos e ordem das seções. A pré-visualização atualiza em tempo real.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Cor Primária</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={budgetConfig.primaryColor} onChange={e => setBudgetConfig({ ...budgetConfig, primaryColor: e.target.value })} className="w-12 p-1" />
                      <Input value={budgetConfig.primaryColor} onChange={e => setBudgetConfig({ ...budgetConfig, primaryColor: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cor de Destaque</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={budgetConfig.secondaryColor} onChange={e => setBudgetConfig({ ...budgetConfig, secondaryColor: e.target.value })} className="w-12 p-1" />
                      <Input value={budgetConfig.secondaryColor} onChange={e => setBudgetConfig({ ...budgetConfig, secondaryColor: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Logo</Label>
                  <div className="flex gap-2 items-center">
                    <Input type="file" accept="image/*" onChange={handleLogoUpload} />
                    {budgetConfig.logo && (
                      <Button variant="outline" size="sm" onClick={() => setBudgetConfig({ ...budgetConfig, logo: "" })}>Remover</Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Título do Documento</Label>
                  <Input value={budgetConfig.headerText} onChange={e => setBudgetConfig({ ...budgetConfig, headerText: e.target.value })} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Tamanho do Logo ({budgetConfig.logoSize}px)</Label>
                    <Slider min={30} max={140} step={2} value={[budgetConfig.logoSize]} onValueChange={([v]) => setBudgetConfig({ ...budgetConfig, logoSize: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tamanho do Título ({budgetConfig.titleSize}px)</Label>
                    <Slider min={12} max={36} step={1} value={[budgetConfig.titleSize]} onValueChange={([v]) => setBudgetConfig({ ...budgetConfig, titleSize: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Corpo do Texto ({budgetConfig.bodySize}px)</Label>
                    <Slider min={9} max={18} step={1} value={[budgetConfig.bodySize]} onValueChange={([v]) => setBudgetConfig({ ...budgetConfig, bodySize: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Espaçamento ({budgetConfig.spacing}px)</Label>
                    <Slider min={4} max={32} step={2} value={[budgetConfig.spacing]} onValueChange={([v]) => setBudgetConfig({ ...budgetConfig, spacing: v })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Observações Padrão</Label>
                  <Textarea rows={2} value={budgetConfig.observations} onChange={e => setBudgetConfig({ ...budgetConfig, observations: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <Label>Rodapé / Slogan</Label>
                  <Input value={budgetConfig.footerText} onChange={e => setBudgetConfig({ ...budgetConfig, footerText: e.target.value })} />
                </div>

                <div className="flex items-center justify-between rounded border p-3">
                  <Label>Mostrar Assinatura</Label>
                  <Switch checked={budgetConfig.showSignature} onCheckedChange={v => setBudgetConfig({ ...budgetConfig, showSignature: v })} />
                </div>

                <div className="space-y-2">
                  <Label>Ordem e Visibilidade das Seções</Label>
                  <div className="border rounded divide-y">
                    {budgetConfig.sections.map((key, idx) => {
                      const hidden = budgetConfig.hiddenSections.includes(key);
                      return (
                        <div key={key} className="flex items-center justify-between p-2">
                          <span className={hidden ? "text-muted-foreground line-through" : ""}>{SECTION_LABELS[key]}</span>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" onClick={() => moveSection(idx, -1)} disabled={idx === 0}><ArrowUp className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => moveSection(idx, 1)} disabled={idx === budgetConfig.sections.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => toggleSection(key)}>
                              {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Button onClick={() => handleSave("budget")} disabled={saving} className="w-full md:w-auto">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Salvar Modelo
                </Button>
              </CardContent>
            </Card>

            {/* PREVIEW */}
            <Card className="xl:sticky xl:top-4 h-fit">
              <CardHeader>
                <CardTitle>Pré-visualização</CardTitle>
                <CardDescription>Reflete exatamente como o orçamento será gerado.</CardDescription>
              </CardHeader>
              <CardContent>
                <BudgetPreview config={budgetConfig} />
              </CardContent>
            </Card>
          </div>
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
                  <Input value={invoiceConfig.paperWidth} onChange={e => setInvoiceConfig({ ...invoiceConfig, paperWidth: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Vendedor Padrão</Label>
                  <Input value={invoiceConfig.defaultSeller} onChange={e => setInvoiceConfig({ ...invoiceConfig, defaultSeller: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Texto de Garantia / Recebimento</Label>
                <Textarea rows={3} value={invoiceConfig.warrantyText} onChange={e => setInvoiceConfig({ ...invoiceConfig, warrantyText: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Rodapé da Nota</Label>
                <Input value={invoiceConfig.footerText} onChange={e => setInvoiceConfig({ ...invoiceConfig, footerText: e.target.value })} />
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

function BudgetPreview({ config }: { config: BudgetConfig }) {
  const items = [
    { name: "Cimento CP II 50kg", qty: 10, unit: "sc", price: 42.90 },
    { name: "Areia Média (m³)", qty: 2, unit: "m³", price: 120.00 },
    { name: "Bloco Cerâmico 9x19x19", qty: 500, unit: "un", price: 1.85 },
  ];
  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const total = subtotal;

  const visible = (k: SectionKey) => !config.hiddenSections.includes(k);
  const body = { fontSize: config.bodySize };
  const gap = { marginBottom: config.spacing };

  const renderSection = (key: SectionKey) => {
    if (!visible(key)) return null;
    switch (key) {
      case "header":
        return (
          <div key={key} style={{ ...gap, borderBottom: `3px solid ${config.primaryColor}`, paddingBottom: 8 }} className="flex items-center gap-3">
            {config.logo ? (
              <img src={config.logo} alt="logo" style={{ height: config.logoSize, width: "auto", objectFit: "contain" }} />
            ) : (
              <div style={{ height: config.logoSize, width: config.logoSize, background: config.primaryColor }} className="rounded flex items-center justify-center text-white font-bold">LOGO</div>
            )}
            <div className="flex-1 text-right">
              <div style={{ color: config.primaryColor, fontSize: config.titleSize, fontWeight: 700 }}>{config.headerText}</div>
              <div style={body} className="text-muted-foreground">Nº 0001 · {new Date().toLocaleDateString("pt-BR")}</div>
            </div>
          </div>
        );
      case "client":
        return (
          <div key={key} style={{ ...body, ...gap }} className="rounded bg-muted/50 p-2">
            <div className="font-semibold" style={{ color: config.primaryColor }}>CLIENTE</div>
            <div>João da Silva · CPF 000.000.000-00</div>
            <div>Rua Exemplo, 123 · Telefone (00) 00000-0000</div>
          </div>
        );
      case "items":
        return (
          <table key={key} style={{ ...body, ...gap, width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: config.primaryColor, color: "white" }}>
                <th style={{ textAlign: "left", padding: 4 }}>Produto</th>
                <th style={{ padding: 4 }}>Qtd</th>
                <th style={{ padding: 4 }}>Un</th>
                <th style={{ textAlign: "right", padding: 4 }}>Unit.</th>
                <th style={{ textAlign: "right", padding: 4 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 4 }}>{it.name}</td>
                  <td style={{ padding: 4, textAlign: "center" }}>{it.qty}</td>
                  <td style={{ padding: 4, textAlign: "center" }}>{it.unit}</td>
                  <td style={{ padding: 4, textAlign: "right" }}>{formatCurrency(it.price)}</td>
                  <td style={{ padding: 4, textAlign: "right" }}>{formatCurrency(it.qty * it.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case "totals":
        return (
          <div key={key} style={{ ...body, ...gap }} className="flex justify-end">
            <div className="min-w-[200px] space-y-1">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between font-bold" style={{ color: config.secondaryColor, fontSize: config.bodySize + 4 }}>
                <span>TOTAL</span><span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        );
      case "observations":
        return (
          <div key={key} style={{ ...body, ...gap }} className="rounded border-l-4 p-2" >
            <div className="font-semibold" style={{ color: config.primaryColor }}>Observações</div>
            <div className="whitespace-pre-wrap">{config.observations}</div>
          </div>
        );
      case "signature":
        return config.showSignature ? (
          <div key={key} style={{ ...body, ...gap, marginTop: 24 }} className="flex justify-around">
            <div className="text-center"><div className="border-t border-black w-40 mx-auto" /><div>Cliente</div></div>
            <div className="text-center"><div className="border-t border-black w-40 mx-auto" /><div>Vendedor</div></div>
          </div>
        ) : null;
      case "footer":
        return (
          <div key={key} style={{ ...body, borderTop: `2px solid ${config.primaryColor}`, paddingTop: 6, textAlign: "center", color: config.primaryColor }}>
            {config.footerText}
          </div>
        );
    }
  };

  return (
    <div className="bg-white text-black p-4 rounded shadow-inner border overflow-auto" style={{ minHeight: 400 }}>
      {config.sections.map(renderSection)}
    </div>
  );
}
