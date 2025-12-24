import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/Header';
import { CustomerForm } from '@/components/CustomerForm';
import { ProductSelector } from '@/components/ProductSelector';
import { ItemsList } from '@/components/ItemsList';
import { QuotationActions } from '@/components/QuotationActions';
import { Dashboard } from '@/components/Dashboard';
import { useQuotations } from '@/hooks/useQuotations';
import { Customer, QuotationItem, Quotation } from '@/types/quotation';
import { downloadPDF } from '@/utils/pdfGenerator';
import { openWhatsApp } from '@/utils/whatsapp';
import { toast } from '@/hooks/use-toast';
import { FilePlus, LayoutDashboard } from 'lucide-react';

const Index = () => {
  const { quotations, saveQuotation, deleteQuotation, generateQuotationNumber } = useQuotations();

  const [customer, setCustomer] = useState<Customer>({
    name: '',
    phone: '',
    address: '',
  });
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [validity, setValidity] = useState('15 dias');
  const [observations, setObservations] = useState('');

  const total = items.reduce((acc, item) => acc + item.subtotal, 0);

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

  const createQuotation = (): Quotation => {
    return {
      id: crypto.randomUUID(),
      number: generateQuotationNumber(),
      customer,
      items,
      total,
      validity,
      observations,
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
    saveQuotation(quotation);
    downloadPDF(quotation);

    toast({
      title: 'PDF gerado com sucesso!',
      description: `Orçamento ${quotation.number} salvo e PDF baixado`,
    });

    resetForm();
  };

  const handleSendWhatsApp = () => {
    if (!validateForm()) return;

    const quotation = createQuotation();
    saveQuotation({ ...quotation, status: 'sent' });
    openWhatsApp(quotation);

    toast({
      title: 'Orçamento enviado!',
      description: `Orçamento ${quotation.number} aberto no WhatsApp`,
    });

    resetForm();
  };

  const resetForm = () => {
    setCustomer({ name: '', phone: '', address: '' });
    setItems([]);
    setObservations('');
  };

  const handleDeleteQuotation = (id: string) => {
    deleteQuotation(id);
    toast({
      title: 'Orçamento excluído',
      variant: 'destructive',
    });
  };

  const isFormValid = customer.name.trim() && customer.phone.trim() && items.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Tabs defaultValue="new" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 h-12">
            <TabsTrigger value="new" className="flex items-center gap-2 text-sm font-medium">
              <FilePlus className="h-4 w-4" />
              Novo Orçamento
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
            <div className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-6 space-y-6">
              <CustomerForm customer={customer} onChange={setCustomer} />
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-6 space-y-6">
              <ProductSelector onAddItem={handleAddItem} />
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-6">
              <ItemsList items={items} onRemoveItem={handleRemoveItem} total={total} />
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-6">
              <QuotationActions
                validity={validity}
                observations={observations}
                onValidityChange={setValidity}
                onObservationsChange={setObservations}
                onGeneratePDF={handleGeneratePDF}
                onSendWhatsApp={handleSendWhatsApp}
                disabled={!isFormValid}
              />
            </div>
          </TabsContent>

          <TabsContent value="dashboard" className="animate-fade-in">
            <Dashboard quotations={quotations} onDelete={handleDeleteQuotation} />
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
