import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { CompanyForm } from '@/components/CompanyForm';
import { CustomerForm } from '@/components/CustomerForm';
import { ProductSelector } from '@/components/ProductSelector';
import { ItemsList } from '@/components/ItemsList';
import { QuotationActions } from '@/components/QuotationActions';
import { QuotationPreview } from '@/components/QuotationPreview';
import { useQuotations } from '@/hooks/useQuotations';
import { Customer, CompanyInfo, PaymentConditions, QuotationItem, Quotation } from '@/types/quotation';
import { downloadPDF, downloadPNG } from '@/utils/pdfGenerator';
import { openWhatsApp } from '@/utils/whatsapp';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Pencil, FileText } from 'lucide-react';

const QuotationsIndex = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const { quotations, saveQuotation, updateQuotation, generateQuotationNumber } = useQuotations();

  // If editing, load the quotation
  const editingSource = editId ? quotations.find(q => q.id === editId) : null;

  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(editingSource?.id ?? null);

  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(editingSource?.companyInfo ?? {
    name: '', cnpj: '', address: '', phone: '', email: '', website: '', sellerName: '', sellerRole: 'Gerente de Vendas',
  });

  const [customer, setCustomer] = useState<Customer>(editingSource?.customer ?? {
    name: '', cnpj: '', phone: '', address: '',
  });

  const [showClientData, setShowClientData] = useState(editingSource?.showClientData ?? true);
  const [items, setItems] = useState<QuotationItem[]>(editingSource?.items ?? []);
  const [validity, setValidity] = useState(editingSource?.validity ?? '7 dias');
  const [observations, setObservations] = useState(editingSource?.observations ?? '');
  const [discount, setDiscount] = useState(editingSource?.discount ?? 0);
  const [freight, setFreight] = useState(editingSource?.freight ?? 0);
  const [deliveryTime, setDeliveryTime] = useState(editingSource?.deliveryTime ?? '7 a 10 dias úteis');
  const [paymentConditions, setPaymentConditions] = useState<PaymentConditions>(editingSource?.paymentConditions ?? {
    cashDiscount: '7% de desconto à vista', installments: '10x no cartão', downPayment: 'Parcelamento sem juros - consultar',
  });
  const [quotationNumber, setQuotationNumber] = useState<string | null>(editingSource?.number ?? null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewQuotation, setPreviewQuotation] = useState<Quotation | null>(null);

  const subtotal = items.reduce((acc, item) => acc + item.subtotal, 0);
  const total = subtotal - discount + freight;

  const handleAddItem = (item: QuotationItem) => {
    setItems(prev => [...prev, item]);
    toast({ title: 'Item adicionado', description: `${item.product.capacity}${item.product.unit} adicionado ao orçamento` });
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    toast({ title: 'Item removido', variant: 'destructive' });
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, quantity, subtotal: item.unitPrice * quantity } : item));
  };

  const createQuotation = (): Quotation => ({
    id: editingQuotationId || crypto.randomUUID(),
    number: quotationNumber || generateQuotationNumber(),
    customer, companyInfo, items, subtotal, discount, freight, total, validity, observations,
    paymentConditions, deliveryTime, showClientData,
    createdAt: new Date(),
    status: 'pending',
  });

  const validateForm = () => {
    if (showClientData && !customer.name.trim()) {
      toast({ title: 'Erro', description: 'Preencha o nome do cliente', variant: 'destructive' });
      return false;
    }
    if (items.length === 0) {
      toast({ title: 'Erro', description: 'Adicione pelo menos um item ao orçamento', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const saveAndExecute = (quotation: Quotation, action: () => void) => {
    if (editingQuotationId) {
      updateQuotation(editingQuotationId, quotation);
    } else {
      saveQuotation(quotation);
    }
    action();
    resetForm();
  };

  const handleGeneratePDF = () => {
    if (!validateForm()) return;
    const q = createQuotation();
    saveAndExecute(q, () => downloadPDF(q));
    toast({ title: 'PDF gerado!', description: `Orçamento ${q.number} salvo` });
  };

  const handleGeneratePNG = async () => {
    if (!validateForm()) return;
    const q = createQuotation();
    if (editingQuotationId) updateQuotation(editingQuotationId, q); else saveQuotation(q);
    await downloadPNG(q);
    toast({ title: 'PNG gerado!', description: `Orçamento ${q.number} salvo` });
    resetForm();
  };

  const handleSendWhatsApp = () => {
    if (!validateForm()) return;
    const q = createQuotation();
    saveAndExecute({ ...q, status: 'sent' }, () => openWhatsApp(q));
    toast({ title: 'Orçamento enviado!', description: `Aberto no WhatsApp` });
  };

  const handlePreview = () => {
    if (!validateForm()) return;
    setPreviewQuotation(createQuotation());
    setPreviewOpen(true);
  };

  const handlePreviewDownloadPDF = () => {
    if (!previewQuotation) return;
    saveAndExecute(previewQuotation, () => downloadPDF(previewQuotation));
    setPreviewOpen(false);
  };

  const handlePreviewDownloadPNG = async () => {
    if (!previewQuotation) return;
    if (editingQuotationId) updateQuotation(editingQuotationId, previewQuotation); else saveQuotation(previewQuotation);
    await downloadPNG(previewQuotation);
    resetForm();
    setPreviewOpen(false);
  };

  const resetForm = () => {
    setCustomer({ name: '', cnpj: '', phone: '', address: '' });
    setItems([]);
    setObservations('');
    setDiscount(0);
    setFreight(0);
    setEditingQuotationId(null);
    setQuotationNumber(null);
  };

  const handleCancelEdit = () => {
    resetForm();
    toast({ title: 'Edição cancelada' });
  };

  const handleBack = () => {
    const from = searchParams.get('from');
    if (from === 'admin') {
      navigate('/admin/orcamentos/fortlev');
    } else {
      navigate(-1);
    }
  };

  const isFormValid = (showClientData ? customer.name.trim() : true) && items.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Top bar: Back + Status */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" className="gap-2 text-muted-foreground" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 text-sm px-3 py-1">
              <FileText className="h-3.5 w-3.5" />
              Rascunho
            </Badge>
          </div>
        </div>

        {editingQuotationId && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-orange-600" />
              <span className="font-medium text-orange-700">
                Editando orçamento: {quotationNumber}
              </span>
            </div>
            <button onClick={handleCancelEdit} className="text-sm text-orange-600 hover:text-orange-800 underline">
              Cancelar edição
            </button>
          </div>
        )}

        <div className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-6 space-y-6">
          <CompanyForm companyInfo={companyInfo} onChange={setCompanyInfo} />
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-6 space-y-6">
          <CustomerForm customer={customer} onChange={setCustomer} showClientData={showClientData} onShowClientDataChange={setShowClientData} />
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-6 space-y-6">
          <ProductSelector onAddItem={handleAddItem} />
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-6">
          <ItemsList items={items} onRemoveItem={handleRemoveItem} onUpdateQuantity={handleUpdateQuantity} total={total} />
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-6">
          <QuotationActions
            validity={validity} observations={observations} discount={discount} freight={freight}
            subtotal={subtotal} deliveryTime={deliveryTime} paymentConditions={paymentConditions}
            onValidityChange={setValidity} onObservationsChange={setObservations} onDiscountChange={setDiscount}
            onFreightChange={setFreight} onDeliveryTimeChange={setDeliveryTime} onPaymentConditionsChange={setPaymentConditions}
            onGeneratePDF={handleGeneratePDF} onGeneratePNG={handleGeneratePNG} onSendWhatsApp={handleSendWhatsApp}
            onPreview={handlePreview} disabled={!isFormValid}
          />
        </div>
      </main>

      <QuotationPreview
        quotation={previewQuotation} open={previewOpen} onOpenChange={setPreviewOpen}
        onDownloadPDF={handlePreviewDownloadPDF} onDownloadPNG={handlePreviewDownloadPNG}
      />

      <footer className="text-center py-6 text-sm text-muted-foreground border-t border-border mt-12">
        <p>Sistema de Orçamentos Fortlev • {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default QuotationsIndex;
