import { useState, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/Header';
import { CompanyForm } from '@/components/CompanyForm';
import { CustomerForm } from '@/components/CustomerForm';
import { ProductSelector } from '@/components/ProductSelector';
import { ItemsList } from '@/components/ItemsList';
import { QuotationActions } from '@/components/QuotationActions';
import { Dashboard } from '@/components/Dashboard';
import { useQuotations } from '@/hooks/useQuotations';
import { Customer, CompanyInfo, PaymentConditions, QuotationItem, Quotation } from '@/types/quotation';
import { downloadPDF, downloadPNG } from '@/utils/pdfGenerator';
import { openWhatsApp } from '@/utils/whatsapp';
import { toast } from '@/hooks/use-toast';
import { FilePlus, LayoutDashboard, Pencil } from 'lucide-react';

const Index = () => {
  const { quotations, saveQuotation, updateQuotation, deleteQuotation, generateQuotationNumber } = useQuotations();

  const [activeTab, setActiveTab] = useState('new');
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);

  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: '',
    cnpj: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    sellerName: '',
    sellerRole: 'Gerente de Vendas',
  });

  const [customer, setCustomer] = useState<Customer>({
    name: '',
    cnpj: '',
    phone: '',
    address: '',
  });

  const [showClientData, setShowClientData] = useState(true);
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [validity, setValidity] = useState('7 dias');
  const [observations, setObservations] = useState('');
  const [discount, setDiscount] = useState(0);
  const [freight, setFreight] = useState(0);
  const [deliveryTime, setDeliveryTime] = useState('7 a 10 dias úteis');
  const [paymentConditions, setPaymentConditions] = useState<PaymentConditions>({
    cashDiscount: '7% de desconto à vista',
    installments: '10x no cartão',
    downPayment: 'Parcelamento sem juros - consultar',
  });
  const [quotationNumber, setQuotationNumber] = useState<string | null>(null);

  const subtotal = items.reduce((acc, item) => acc + item.subtotal, 0);
  const total = subtotal - discount + freight;

  const handleAddItem = (item: QuotationItem) => {
    setItems([...items, item]);
    toast({
      title: 'Item adicionado',
      description: `${item.product.capacity}${item.product.unit} adicionado ao orçamento`,
    });
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
    toast({
      title: 'Item removido',
      variant: 'destructive',
    });
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    setItems(items.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          quantity,
          subtotal: item.unitPrice * quantity,
        };
      }
      return item;
    }));
    toast({
      title: 'Quantidade atualizada',
    });
  };

  const createQuotation = (): Quotation => {
    return {
      id: editingQuotationId || crypto.randomUUID(),
      number: quotationNumber || generateQuotationNumber(),
      customer,
      companyInfo,
      items,
      subtotal,
      discount,
      freight,
      total,
      validity,
      observations,
      paymentConditions,
      deliveryTime,
      showClientData,
      createdAt: new Date(),
      status: 'pending',
    };
  };

  const validateForm = () => {
    if (!customer.name.trim()) {
      toast({
        title: 'Erro',
        description: 'Preencha o nome do cliente',
        variant: 'destructive',
      });
      return false;
    }
    if (!customer.phone.trim()) {
      toast({
        title: 'Erro',
        description: 'Preencha o telefone do cliente',
        variant: 'destructive',
      });
      return false;
    }
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

    const quotation = createQuotation();
    
    if (editingQuotationId) {
      // Update existing quotation
      updateQuotation(editingQuotationId, quotation);
      toast({
        title: 'Orçamento atualizado!',
        description: `Orçamento ${quotation.number} atualizado e PDF baixado`,
      });
    } else {
      // Save new quotation
      saveQuotation(quotation);
      toast({
        title: 'PDF gerado com sucesso!',
        description: `Orçamento ${quotation.number} salvo e PDF baixado`,
      });
    }
    
    downloadPDF(quotation);
    resetForm();
  };

  const handleGeneratePNG = async () => {
    if (!validateForm()) return;

    const quotation = createQuotation();
    
    if (editingQuotationId) {
      updateQuotation(editingQuotationId, quotation);
      toast({
        title: 'Orçamento atualizado!',
        description: `Orçamento ${quotation.number} atualizado e imagem baixada`,
      });
    } else {
      saveQuotation(quotation);
      toast({
        title: 'PNG gerado com sucesso!',
        description: `Orçamento ${quotation.number} salvo e imagem baixada`,
      });
    }
    
    await downloadPNG(quotation);
    resetForm();
  };

  const handleSendWhatsApp = () => {
    if (!validateForm()) return;

    const quotation = createQuotation();
    
    if (editingQuotationId) {
      updateQuotation(editingQuotationId, { ...quotation, status: 'sent' });
    } else {
      saveQuotation({ ...quotation, status: 'sent' });
    }
    
    openWhatsApp(quotation);

    toast({
      title: 'Orçamento enviado!',
      description: `Orçamento ${quotation.number} aberto no WhatsApp`,
    });

    resetForm();
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

  const handleEditQuotation = (quotation: Quotation) => {
    // Load quotation data into form
    setEditingQuotationId(quotation.id);
    setQuotationNumber(quotation.number);
    setCustomer(quotation.customer);
    setCompanyInfo(quotation.companyInfo);
    setItems(quotation.items);
    setValidity(quotation.validity);
    setObservations(quotation.observations);
    setDiscount(quotation.discount);
    setFreight(quotation.freight || 0);
    setDeliveryTime(quotation.deliveryTime);
    setPaymentConditions(quotation.paymentConditions);
    setShowClientData(quotation.showClientData);
    
    // Switch to new quotation tab
    setActiveTab('new');
    
    toast({
      title: 'Modo de edição',
      description: `Editando orçamento ${quotation.number}`,
    });
  };

  const handleDeleteQuotation = (id: string) => {
    deleteQuotation(id);
    toast({
      title: 'Orçamento excluído',
      variant: 'destructive',
    });
  };

  const handleCancelEdit = () => {
    resetForm();
    toast({
      title: 'Edição cancelada',
      description: 'Formulário limpo',
    });
  };

  const isFormValid = customer.name.trim() && customer.phone.trim() && items.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
            <TabsTrigger value="dashboard" className="flex items-center gap-2 text-sm font-medium">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
              {quotations.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-fortlev-yellow text-fortlev-navy font-semibold">
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
                  <span className="font-medium text-orange-700">
                    Editando orçamento: {quotationNumber}
                  </span>
                </div>
                <button 
                  onClick={handleCancelEdit}
                  className="text-sm text-orange-600 hover:text-orange-800 underline"
                >
                  Cancelar edição
                </button>
              </div>
            )}

            <div className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-6 space-y-6">
              <CompanyForm companyInfo={companyInfo} onChange={setCompanyInfo} />
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-6 space-y-6">
              <CustomerForm 
                customer={customer} 
                onChange={setCustomer}
                showClientData={showClientData}
                onShowClientDataChange={setShowClientData}
              />
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-6 space-y-6">
              <ProductSelector onAddItem={handleAddItem} />
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-6">
              <ItemsList 
                items={items} 
                onRemoveItem={handleRemoveItem} 
                onUpdateQuantity={handleUpdateQuantity}
                total={total} 
              />
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-6">
              <QuotationActions
                validity={validity}
                observations={observations}
                discount={discount}
                freight={freight}
                subtotal={subtotal}
                deliveryTime={deliveryTime}
                paymentConditions={paymentConditions}
                onValidityChange={setValidity}
                onObservationsChange={setObservations}
                onDiscountChange={setDiscount}
                onFreightChange={setFreight}
                onDeliveryTimeChange={setDeliveryTime}
                onPaymentConditionsChange={setPaymentConditions}
                onGeneratePDF={handleGeneratePDF}
                onGeneratePNG={handleGeneratePNG}
                onSendWhatsApp={handleSendWhatsApp}
                disabled={!isFormValid}
              />
            </div>
          </TabsContent>

          <TabsContent value="dashboard" className="animate-fade-in">
            <Dashboard 
              quotations={quotations} 
              onDelete={handleDeleteQuotation}
              onEdit={handleEditQuotation}
            />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="text-center py-6 text-sm text-muted-foreground border-t border-border mt-12">
        <p>Sistema de Orçamentos Fortlev • {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default Index;
