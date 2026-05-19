import { useState, useEffect, useRef } from 'react';
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
import { cloud } from '@/lib/cloud';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Pencil, FileText, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { findNearestFactory, getUFCoordinates } from '@/utils/proximity';

const QuotationsIndex = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const publicToken = searchParams.get('token');

  const { quotations, loading, saveQuotation, updateQuotation, generateQuotationNumber } = useQuotations();

  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);
  const editLoaded = useRef(false);
  const [factories, setFactories] = useState<any[]>([]);
  const [isRouting, setIsRouting] = useState(false);

  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: '', cnpj: '', address: '', phone: '', email: '', website: '', sellerName: '', sellerRole: 'Gerente de Vendas',
  });

  const [customer, setCustomer] = useState<Customer>({
    name: '', cnpj: '', phone: '', address: '',
  });

  const [showClientData, setShowClientData] = useState(true);
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [validity, setValidity] = useState('7 dias');
  const [observations, setObservations] = useState('');
  const [discount, setDiscount] = useState(0);
  const [freight, setFreight] = useState(0);
  const [deliveryTime, setDeliveryTime] = useState('7 a 10 dias úteis');
  const [paymentConditions, setPaymentConditions] = useState<PaymentConditions>({
    cashDiscount: '7% de desconto à vista', installments: '10x no cartão', downPayment: 'Parcelamento sem juros - consultar',
  });
  const [quotationNumber, setQuotationNumber] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewQuotation, setPreviewQuotation] = useState<Quotation | null>(null);

  // Load Fortlev factories
  useEffect(() => {
    const fetchFactories = async () => {
      const { data } = await supabase
        .from('issuing_companies')
        .select('*')
        .eq('company_type', 'fortlev')
        .eq('is_active', true);
      
      if (data) setFactories(data);
    };
    fetchFactories();
  }, []);

  // Nearest Factory Routing
  useEffect(() => {
    if (!customer.address || editingQuotationId || factories.length === 0) return;

    const findNearest = async () => {
      // Try to find state UF in address
      const ufMatch = customer.address.match(/\b([A-Z]{2})\b/);
      if (ufMatch) {
        const uf = ufMatch[1];
        const coords = getUFCoordinates(uf);
        if (coords) {
          const nearest = findNearestFactory(coords, factories);
          if (nearest && nearest.name !== companyInfo.name) {
            setCompanyInfo({
              name: nearest.name,
              cnpj: nearest.cnpj,
              address: nearest.address,
              phone: nearest.phone,
              email: nearest.email,
              website: nearest.website,
              sellerName: companyInfo.sellerName,
              sellerRole: companyInfo.sellerRole,
            });
            toast({ 
              title: 'Unidade inteligente', 
              description: `Selecionamos a unidade ${nearest.trading_name || nearest.name} por proximidade.`
            });
          }
        }
      }
    };

    const timer = setTimeout(findNearest, 1000);
    return () => clearTimeout(timer);
  }, [customer.address, factories, editingQuotationId]);

  // Load quotation data when editing and data becomes available
  useEffect(() => {
    if (!editId || editLoaded.current || loading) return;
    const source = quotations.find(q => q.id === editId);
    if (!source) return;
    editLoaded.current = true;
    setEditingQuotationId(source.id);
    setQuotationNumber(source.number);
    setCompanyInfo(source.companyInfo);
    setCustomer(source.customer);
    setItems(source.items);
    setValidity(source.validity);
    setObservations(source.observations);
    setDiscount(source.discount);
    setFreight(source.freight ?? 0);
    setDeliveryTime(source.deliveryTime);
    setPaymentConditions(source.paymentConditions);
    setShowClientData(source.showClientData);
    toast({ title: 'Modo de edição', description: `Editando orçamento ${source.number}` });
  }, [editId, quotations, loading]);

  const subtotal = items.reduce((acc, item) => acc + item.subtotal, 0);
  const total = subtotal - discount + freight;

  const getTokenContext = () => {
    if (!publicToken) return null;
    const raw = localStorage.getItem('public_quotation_token_ctx');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { token?: string; tokenId?: string; storeId?: string };
      if (!parsed?.tokenId || !parsed?.storeId) return null;
      if (parsed?.token && parsed.token !== publicToken) return null;
      return parsed;
    } catch {
      return null;
    }
  };

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
    const tokenCtx = getTokenContext();
    const row = {
      ...q,
      created_via_token: Boolean(tokenCtx),
      source_token_id: tokenCtx?.tokenId ?? null,
    } as any;
    saveAndExecute(row, () => downloadPDF(q));

    if (tokenCtx) {
      cloud.rpc('log_token_action', {
        _raw_token: publicToken,
        _store_id: tokenCtx.storeId,
        _action: 'created_quotation',
        _quotation_type: 'fortlev',
        _quotation_id: q.id,
        _ip: null,
        _user_agent: navigator.userAgent,
        _source: 'public',
      });
    }

    toast({ title: 'PDF gerado!', description: `Orçamento ${q.number} salvo` });
  };

  const handleGeneratePNG = async () => {
    if (!validateForm()) return;
    const q = createQuotation();
    const tokenCtx = getTokenContext();
    const row = {
      ...q,
      created_via_token: Boolean(tokenCtx),
      source_token_id: tokenCtx?.tokenId ?? null,
    } as any;
    if (editingQuotationId) updateQuotation(editingQuotationId, row); else saveQuotation(row);

    if (tokenCtx) {
      cloud.rpc('log_token_action', {
        _raw_token: publicToken,
        _store_id: tokenCtx.storeId,
        _action: 'created_quotation',
        _quotation_type: 'fortlev',
        _quotation_id: q.id,
        _ip: null,
        _user_agent: navigator.userAgent,
        _source: 'public',
      });
    }

    await downloadPNG(q);
    toast({ title: 'PNG gerado!', description: `Orçamento ${q.number} salvo` });
    resetForm();
  };

  const handleSendWhatsApp = () => {
    if (!validateForm()) return;
    const q = createQuotation();
    const tokenCtx = getTokenContext();
    const row = {
      ...q,
      status: 'sent',
      created_via_token: Boolean(tokenCtx),
      source_token_id: tokenCtx?.tokenId ?? null,
    } as any;
    saveAndExecute(row, () => openWhatsApp(q));

    if (tokenCtx) {
      cloud.rpc('log_token_action', {
        _raw_token: publicToken,
        _store_id: tokenCtx.storeId,
        _action: 'created_quotation',
        _quotation_type: 'fortlev',
        _quotation_id: q.id,
        _ip: null,
        _user_agent: navigator.userAgent,
        _source: 'public',
      });
    }

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
    navigate('/admin/orcamentos/fortlev');
  };

  // Show loading state when editing but data hasn't loaded yet
  if (editId && loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Carregando orçamento...</span>
        </div>
      </div>
    );
  }

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
