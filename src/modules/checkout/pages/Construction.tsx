import { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConstructionProductSelector } from '@/components/ConstructionProductSelector';
import { CompanyForm } from '@/components/CompanyForm';
import { ConstructionItemsList } from '@/components/ConstructionItemsList';
import { CustomerForm } from '@/components/CustomerForm';
import { QuotationPreview } from '@/components/QuotationPreview';
import type { ConstructionQuotationItem, ConstructionQuotation } from '@/types/construction';
import type { Customer, CompanyInfo, PaymentConditions, Quotation, QuotationItem } from '@/types/quotation';
import { downloadPDF, downloadPNG } from '@/utils/pdfGenerator';
import { openWhatsApp } from '@/utils/whatsapp';
import { toast } from '@/hooks/use-toast';
import { FilePlus, LayoutDashboard, Pencil, Building2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/utils/formatters';
import { useConstructionQuotations } from '@/hooks/useConstructionQuotations';
import { ConstructionQuotationsDashboard } from '@/components/construction/ConstructionQuotationsDashboard';

const ConstructionPage = () => {
  const { quotations, saveQuotation, updateQuotation, deleteQuotation, duplicateQuotation, generateQuotationNumber } = useConstructionQuotations();
  const [searchParams] = useSearchParams();
  const returnPath = '/admin/orcamentos/construcao';
  const [activeTab, setActiveTab] = useState<'new' | 'saved'>('new');
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);

  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: 'Material de Construção',
    cnpj: '04.925.466/0001-59',
    address: 'R. Carlos Drumont de Andrade, 484 - Vista Alegre, Vespasiano - MG, 33200-000',
    phone: '(31) 9 9372-6642',
    email: 'vendas@materialdecontrucao.online',
    website: '',
    sellerName: '',
    sellerRole: 'Vendedor',
  });

  const [customer, setCustomer] = useState<Customer>({
    name: '',
    cnpj: '',
    phone: '',
    address: '',
  });

  const [showClientData, setShowClientData] = useState(true);
  const [items, setItems] = useState<ConstructionQuotationItem[]>([]);
  const [validity, setValidity] = useState('5 dias');
  const [observations, setObservations] = useState(
    'VALIDADE P/ TROCA 5 DIAS * PRAZO MÁXIMO P/ RETIRADA 30 DIAS * APÓS O PRAZO O VALOR DO PEDIDO É CONVERTIDO EM CRÉDITO NA LOJA * DESCARGA DE MERCADORIA É FEITA NO PASSEIO * NÃO SUBIMOS E NEM DESCEMOS ESCADA PARA ENTREGA DE MERCADORIA'
  );
  const [discount, setDiscount] = useState(0);
  const [freight, setFreight] = useState(0);
  const [deliveryTime, setDeliveryTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [paymentConditions, setPaymentConditions] = useState<PaymentConditions>({
    cashDiscount: 'PIX',
    installments: '',
    downPayment: '',
  });

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewQuotation, setPreviewQuotation] = useState<Quotation | null>(null);

  const subtotal = useMemo(() => items.reduce((acc, item) => acc + item.subtotal, 0), [items]);
  const total = subtotal - discount + freight;

  const handleAddItem = (item: ConstructionQuotationItem) => {
    setItems((prev) => [...prev, item]);
    toast({
      title: 'Item adicionado',
      description: `${item.product.name} adicionado ao orçamento`,
    });
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    toast({
      title: 'Item removido',
      variant: 'destructive',
    });
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            quantity,
            subtotal: item.unitPrice * quantity,
          };
        }
        return item;
      })
    );
  };

  // Convert construction items to quotation items for PDF
  const convertToQuotationItems = (sourceItems: ConstructionQuotationItem[]): QuotationItem[] => {
    return sourceItems.map((item) => ({
      id: item.id,
      product: {
        id: item.product.id,
        // IMPORTANTE: o PDF/PNG de construção deve usar o nome do produto.
        name: item.product.name,
        capacity: 0,
        unit: item.product.unit,
        height: '',
        diameter: '',
        basePrice: item.product.basePrice,
        type: 'caixa' as const,
      },
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
    }));
  };

  type QuotationMeta = { id: string; number: string };

  const createQuotation = (meta: QuotationMeta, sourceItems: ConstructionQuotationItem[]): Quotation => {
    return {
      id: meta.id,
      number: meta.number,
      customer,
      companyInfo,
      items: convertToQuotationItems(sourceItems),
      subtotal,
      discount,
      freight,
      total,
      validity,
      observations,
      paymentConditions: {
        ...paymentConditions,
        cashDiscount: paymentMethod,
      },
      deliveryTime,
      showClientData,
      createdAt: new Date(),
      status: 'pending',
      branding: {
        showBrand: false,
      },
    };
  };

  const createConstructionQuotation = (meta: QuotationMeta, sourceItems: ConstructionQuotationItem[]): ConstructionQuotation => {
    return {
      id: meta.id,
      number: meta.number,
      customer: {
        name: customer.name,
        cpfCnpj: customer.cnpj,
        phone: customer.phone,
        address: customer.address,
      },
      companyInfo: {
        name: companyInfo.name,
        cnpj: companyInfo.cnpj,
        ie: '',
        address: companyInfo.address,
        phone: companyInfo.phone,
        email: companyInfo.email,
        sellerName: companyInfo.sellerName,
      },
      items: sourceItems,
      subtotal,
      discount,
      freight,
      total,
      validity,
      observations,
      paymentMethod,
      deliveryDate: deliveryTime,
      showClientData,
      createdAt: new Date(),
      status: 'pending',
    };
  };

  const validateForm = () => {
    if (items.length === 0) {
      toast({
        title: 'Erro',
        description: 'Adicione pelo menos um item ao orçamento',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const handleGeneratePDF = () => {
    if (!validateForm()) return;

    const meta: QuotationMeta = {
      id: editingQuotationId || crypto.randomUUID(),
      number: editingQuotationId ? (quotations.find((q) => q.id === editingQuotationId)?.number || generateQuotationNumber()) : generateQuotationNumber(),
    };

    const qDoc = createQuotation(meta, items);
    const qSaved = createConstructionQuotation(meta, items);

    if (editingQuotationId) {
      updateQuotation(editingQuotationId, qSaved);
    } else {
      saveQuotation(qSaved);
    }

    downloadPDF(qDoc);
    toast({ title: 'PDF gerado com sucesso!', description: `Orçamento ${meta.number} gerado` });
    resetForm();
  };

  const handleGeneratePNG = async () => {
    if (!validateForm()) return;

    const meta: QuotationMeta = {
      id: editingQuotationId || crypto.randomUUID(),
      number: editingQuotationId ? (quotations.find((q) => q.id === editingQuotationId)?.number || generateQuotationNumber()) : generateQuotationNumber(),
    };

    const qDoc = createQuotation(meta, items);
    const qSaved = createConstructionQuotation(meta, items);

    if (editingQuotationId) {
      updateQuotation(editingQuotationId, qSaved);
    } else {
      saveQuotation(qSaved);
    }

    await downloadPNG(qDoc);
    toast({ title: 'PNG gerado com sucesso!' });
    resetForm();
  };

  const handleSendWhatsApp = () => {
    if (!validateForm()) return;

    const meta: QuotationMeta = {
      id: editingQuotationId || crypto.randomUUID(),
      number: editingQuotationId ? (quotations.find((q) => q.id === editingQuotationId)?.number || generateQuotationNumber()) : generateQuotationNumber(),
    };

    const qDoc = createQuotation(meta, items);
    const qSaved = createConstructionQuotation(meta, items);

    if (editingQuotationId) {
      updateQuotation(editingQuotationId, { ...qSaved, status: 'sent' });
    } else {
      saveQuotation({ ...qSaved, status: 'sent' });
    }

    openWhatsApp(qDoc);
    toast({ title: 'WhatsApp aberto!' });
    resetForm();
  };

  const handlePreview = () => {
    if (!validateForm()) return;

    const meta: QuotationMeta = {
      id: editingQuotationId || crypto.randomUUID(),
      number: editingQuotationId ? (quotations.find((q) => q.id === editingQuotationId)?.number || generateQuotationNumber()) : generateQuotationNumber(),
    };

    const qDoc = createQuotation(meta, items);
    setPreviewQuotation(qDoc);
    setPreviewOpen(true);
  };

  const handleEditQuotation = (q: ConstructionQuotation) => {
    setEditingQuotationId(q.id);
    setCustomer({
      name: q.customer?.name || '',
      cnpj: q.customer?.cpfCnpj || '',
      phone: q.customer?.phone || '',
      address: q.customer?.address || '',
    });
    setCompanyInfo((prev) => ({
      ...prev,
      name: q.companyInfo?.name || prev.name,
      cnpj: q.companyInfo?.cnpj || prev.cnpj,
      address: q.companyInfo?.address || prev.address,
      phone: q.companyInfo?.phone || prev.phone,
      email: q.companyInfo?.email || prev.email,
      sellerName: q.companyInfo?.sellerName || prev.sellerName,
    }));
    setItems(q.items || []);
    setValidity(q.validity || '5 dias');
    setObservations(q.observations || '');
    setDiscount(q.discount || 0);
    setFreight(q.freight || 0);
    setDeliveryTime(q.deliveryDate || '');
    setPaymentMethod(q.paymentMethod || 'PIX');
    setShowClientData(Boolean(q.showClientData));

    setActiveTab('new');

    toast({
      title: 'Modo de edição',
      description: `Editando orçamento ${q.number}`,
    });
  };

  const handleDeleteQuotation = (id: string) => {
    deleteQuotation(id);
    toast({ title: 'Orçamento excluído', variant: 'destructive' });
  };

  const resetForm = () => {
    setCustomer({ name: '', cnpj: '', phone: '', address: '' });
    setItems([]);
    setDiscount(0);
    setFreight(0);
    setEditingQuotationId(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={returnPath}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8" />
                <div>
                  <h1 className="text-xl font-bold">Materiais de Construção</h1>
                  <p className="text-sm text-orange-100">Sistema de Orçamentos</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 h-12">
            <TabsTrigger value="new" className="flex items-center gap-2 text-sm font-medium">
              {editingQuotationId ? (
                <>
                  <Pencil className="h-4 w-4" />
                  Editando Orçamento
                </>
              ) : (
                <>
                  <FilePlus className="h-4 w-4" />
                  Novo Orçamento
                </>
              )}
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center gap-2 text-sm font-medium">
              <LayoutDashboard className="h-4 w-4" />
              Orçamentos
              {quotations.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-white/20 text-white font-semibold">
                  {quotations.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-6 animate-fade-in">
            {editingQuotationId && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pencil className="h-5 w-5 text-orange-600" />
                  <span className="font-medium text-orange-700">Editando orçamento</span>
                </div>
                <button onClick={resetForm} className="text-sm text-orange-600 hover:text-orange-800 underline">
                  Cancelar edição
                </button>
              </div>
            )}

            {/* Company Info */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-6 space-y-4">
              <CompanyForm companyInfo={companyInfo} onChange={setCompanyInfo} />
            </div>

            {/* Customer Form */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-6 space-y-6">
              <CustomerForm customer={customer} onChange={setCustomer} showClientData={showClientData} onShowClientDataChange={setShowClientData} />
            </div>

            {/* Product Selector */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-6 space-y-6">
              <ConstructionProductSelector onAddItem={handleAddItem} />
            </div>

            {/* Items List */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-6">
              <ConstructionItemsList items={items} onRemoveItem={handleRemoveItem} onUpdateQuantity={handleUpdateQuantity} total={total} />
            </div>

            {/* Actions */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-6 space-y-6">
              {/* Payment and Delivery */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Forma de Pagamento</Label>
                  <Input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} placeholder="Ex: PIX, Cartão, Boleto" />
                </div>
                <div className="space-y-2">
                  <Label>Data/Prazo de Entrega</Label>
                  <Input value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)} placeholder="Ex: 07/01/2025 - 14h" />
                </div>
                <div className="space-y-2">
                  <Label>Validade do Orçamento</Label>
                  <Input value={validity} onChange={(e) => setValidity(e.target.value)} placeholder="Ex: 5 dias" />
                </div>
              </div>

              {/* Freight and Discount */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frete (R$)</Label>
                  <Input type="number" value={freight} onChange={(e) => setFreight(parseFloat(e.target.value) || 0)} placeholder="0,00" />
                </div>
                <div className="space-y-2">
                  <Label>Desconto (R$)</Label>
                  <Input type="number" value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} placeholder="0,00" />
                </div>
              </div>

              {/* Observations */}
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={3} placeholder="Observações do orçamento..." />
              </div>

              {/* Summary */}
              <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {freight > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Frete:</span>
                      <span>+ {formatCurrency(freight)}</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Desconto:</span>
                      <span>- {formatCurrency(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total:</span>
                    <span className="text-orange-600">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 justify-end">
                <Button variant="outline" onClick={handlePreview} disabled={items.length === 0}>
                  Pré-visualizar
                </Button>
                <Button onClick={handleGeneratePDF} disabled={items.length === 0} className="bg-orange-600 hover:bg-orange-700">
                  Gerar PDF
                </Button>
                <Button onClick={handleGeneratePNG} disabled={items.length === 0} variant="secondary">
                  Gerar PNG
                </Button>
                <Button onClick={handleSendWhatsApp} disabled={items.length === 0} className="bg-green-600 hover:bg-green-700">
                  Enviar WhatsApp
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="saved" className="animate-fade-in">
            <ConstructionQuotationsDashboard
              quotations={quotations}
              onEdit={handleEditQuotation}
              onDelete={handleDeleteQuotation}
              onSave={(q) => updateQuotation(q.id, q)}
              onDuplicate={duplicateQuotation}
            />
          </TabsContent>
        </Tabs>
      </main>

      <QuotationPreview
        quotation={previewQuotation}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onDownloadPDF={() => previewQuotation && downloadPDF(previewQuotation)}
        onDownloadPNG={() => previewQuotation && downloadPNG(previewQuotation)}
      />

      <footer className="text-center py-6 text-sm text-muted-foreground border-t border-border mt-12">
        <p>Sistema de Orçamentos - Materiais de Construção • {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default ConstructionPage;
