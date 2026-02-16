import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConstructionProductSelector } from '@/components/ConstructionProductSelector';
import { ConstructionItemsList } from '@/components/ConstructionItemsList';
import { CustomerForm } from '@/components/CustomerForm';
import { QuotationActions } from '@/components/QuotationActions';
import { QuotationPreview } from '@/components/QuotationPreview';
import { ConstructionQuotationItem, ConstructionCustomer, ConstructionCompanyInfo, ConstructionQuotation } from '@/types/construction';
import { Customer, CompanyInfo, PaymentConditions, Quotation, QuotationItem } from '@/types/quotation';
import { downloadPDF, downloadPNG } from '@/utils/pdfGenerator';
import { openWhatsApp } from '@/utils/whatsapp';
import { toast } from '@/hooks/use-toast';
import { FilePlus, LayoutDashboard, Pencil, Building2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/utils/formatters';

const ConstructionPage = () => {
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
  const [observations, setObservations] = useState('VALIDADE P/ TROCA 5 DIAS * PRAZO MÁXIMO P/ RETIRADA 30 DIAS * APÓS O PRAZO O VALOR DO PEDIDO É CONVERTIDO EM CRÉDITO NA LOJA * DESCARGA DE MERCADORIA É FEITA NO PASSEIO * NÃO SUBIMOS E NEM DESCEMOS ESCADA PARA ENTREGA DE MERCADORIA');
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

  const subtotal = items.reduce((acc, item) => acc + item.subtotal, 0);
  const total = subtotal - discount + freight;

  const handleAddItem = (item: ConstructionQuotationItem) => {
    setItems([...items, item]);
    toast({
      title: 'Item adicionado',
      description: `${item.product.name} adicionado ao orçamento`,
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
  };

  const generateQuotationNumber = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 11; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Convert construction items to quotation items for PDF
  const convertToQuotationItems = (): QuotationItem[] => {
    return items.map(item => ({
      id: item.id,
      product: {
        id: item.product.id,
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

  const createQuotation = (): Quotation => {
    return {
      id: crypto.randomUUID(),
      number: generateQuotationNumber(),
      customer,
      companyInfo,
      items: convertToQuotationItems(),
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
    const quotation = createQuotation();
    downloadPDF(quotation);
    toast({
      title: 'PDF gerado com sucesso!',
      description: `Orçamento ${quotation.number} gerado`,
    });
  };

  const handleGeneratePNG = async () => {
    if (!validateForm()) return;
    const quotation = createQuotation();
    await downloadPNG(quotation);
    toast({
      title: 'PNG gerado com sucesso!',
    });
  };

  const handleSendWhatsApp = () => {
    if (!validateForm()) return;
    const quotation = createQuotation();
    openWhatsApp(quotation);
    toast({
      title: 'WhatsApp aberto!',
    });
  };

  const handlePreview = () => {
    if (!validateForm()) return;
    const quotation = createQuotation();
    setPreviewQuotation(quotation);
    setPreviewOpen(true);
  };

  const resetForm = () => {
    setCustomer({ name: '', cnpj: '', phone: '', address: '' });
    setItems([]);
    setDiscount(0);
    setFreight(0);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
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
        {/* Company Info */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5 text-orange-500" />
            Dados da Empresa
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Nome da Empresa</Label>
              <Input 
                value={companyInfo.name} 
                onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input 
                value={companyInfo.cnpj} 
                onChange={(e) => setCompanyInfo({ ...companyInfo, cnpj: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input 
                value={companyInfo.phone} 
                onChange={(e) => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Endereço</Label>
              <Input 
                value={companyInfo.address} 
                onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Vendedor</Label>
              <Input 
                value={companyInfo.sellerName} 
                onChange={(e) => setCompanyInfo({ ...companyInfo, sellerName: e.target.value })}
                placeholder="Nome do vendedor"
              />
            </div>
          </div>
        </div>

        {/* Customer Form */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-6 space-y-6">
          <CustomerForm 
            customer={customer} 
            onChange={setCustomer}
            showClientData={showClientData}
            onShowClientDataChange={setShowClientData}
          />
        </div>

        {/* Product Selector */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-6 space-y-6">
          <ConstructionProductSelector onAddItem={handleAddItem} />
        </div>

        {/* Items List */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-6">
          <ConstructionItemsList 
            items={items} 
            onRemoveItem={handleRemoveItem} 
            onUpdateQuantity={handleUpdateQuantity}
            total={total} 
          />
        </div>

        {/* Actions */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-6 space-y-6">
          {/* Payment and Delivery */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Input 
                value={paymentMethod} 
                onChange={(e) => setPaymentMethod(e.target.value)}
                placeholder="Ex: PIX, Cartão, Boleto"
              />
            </div>
            <div className="space-y-2">
              <Label>Data/Prazo de Entrega</Label>
              <Input 
                value={deliveryTime} 
                onChange={(e) => setDeliveryTime(e.target.value)}
                placeholder="Ex: 07/01/2025 - 14h"
              />
            </div>
            <div className="space-y-2">
              <Label>Validade do Orçamento</Label>
              <Input 
                value={validity} 
                onChange={(e) => setValidity(e.target.value)}
                placeholder="Ex: 5 dias"
              />
            </div>
          </div>

          {/* Freight and Discount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Frete (R$)</Label>
              <Input 
                type="number"
                value={freight}
                onChange={(e) => setFreight(parseFloat(e.target.value) || 0)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Desconto (R$)</Label>
              <Input 
                type="number"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                placeholder="0,00"
              />
            </div>
          </div>

          {/* Observations */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea 
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={3}
              placeholder="Observações do orçamento..."
            />
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
            <Button 
              variant="outline" 
              onClick={handlePreview}
              disabled={items.length === 0}
            >
              Pré-visualizar
            </Button>
            <Button 
              onClick={handleGeneratePDF}
              disabled={items.length === 0}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Gerar PDF
            </Button>
            <Button 
              onClick={handleGeneratePNG}
              disabled={items.length === 0}
              variant="secondary"
            >
              Gerar PNG
            </Button>
            <Button 
              onClick={handleSendWhatsApp}
              disabled={items.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              Enviar WhatsApp
            </Button>
          </div>
        </div>
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
