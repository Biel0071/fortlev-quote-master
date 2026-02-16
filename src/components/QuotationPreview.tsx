import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Quotation } from '@/types/quotation';
import { formatCurrency } from '@/utils/formatters';
import { FileText, Image, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

interface QuotationPreviewProps {
  quotation: Quotation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownloadPDF: () => void;
  onDownloadPNG: () => void;
}

const getProductTypeLabel = (type: string): string => {
  switch (type) {
    case 'caixa':
      return "Caixa d'Água";
    case 'tanque':
      return 'Tanque';
    case 'tanque-industrial':
      return 'Industrial';
    case 'tanque-verde':
      return 'Verde';
    default:
      return 'Produto';
  }
};

export const QuotationPreview = ({
  quotation,
  open,
  onOpenChange,
  onDownloadPDF,
  onDownloadPNG,
}: QuotationPreviewProps) => {
  if (!quotation) return null;

  // Default values for backwards compatibility with old quotations
  const companyInfo = quotation.companyInfo || {
    name: '',
    cnpj: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    sellerName: '',
    sellerRole: '',
  };

  const customer = quotation.customer || {
    name: '',
    cnpj: '',
    phone: '',
    address: '',
  };

  const paymentConditions = quotation.paymentConditions || {
    cashDiscount: '',
    installments: '',
    downPayment: '',
  };

  const branding = quotation.branding ?? {
    showBrand: true,
    brandText: 'FORTLEV',
  };

  const formatDate = (date: Date) => {
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">Pré-visualização do Orçamento</DialogTitle>
          </div>
        </DialogHeader>

        {/* Preview Content */}
        <div className="p-6">
          <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-muted/50 p-6 flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-primary italic">ORÇAMENTO OFICIAL</h1>
              </div>
              {branding.showBrand && (
                <div className="text-right">
                  <h2 className="text-2xl font-bold text-primary">{branding.brandText || 'FORTLEV'}</h2>
                </div>
              )}
            </div>

            {/* Company Info */}
            <div className="p-6 border-b border-border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 text-sm">
                  {companyInfo.name && (
                    <p><span className="text-muted-foreground">Emitido por:</span> {companyInfo.name}</p>
                  )}
                  {companyInfo.cnpj && (
                    <p><span className="text-muted-foreground">CNPJ:</span> {companyInfo.cnpj}</p>
                  )}
                  {companyInfo.address && (
                    <p><span className="text-muted-foreground">Endereço:</span> {companyInfo.address}</p>
                  )}
                  {companyInfo.phone && (
                    <p><span className="text-muted-foreground">Telefone:</span> {companyInfo.phone}</p>
                  )}
                  {companyInfo.email && (
                    <p><span className="text-muted-foreground">E-mail:</span> {companyInfo.email}</p>
                  )}
                  {companyInfo.website && (
                    <p><span className="text-muted-foreground">Site:</span> {companyInfo.website}</p>
                  )}
                </div>
                <div className="text-right space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Data de Emissão:</span> {formatDate(quotation.createdAt)}</p>
                  <p><span className="text-muted-foreground">Validade:</span> {quotation.validity}</p>
                </div>
              </div>
            </div>

            {/* Quotation Number */}
            <div className="px-6 py-3 border-b border-border bg-muted/30 flex justify-between items-center">
              <p className="font-semibold text-sm">Orçamento nº: {quotation.number}</p>
              <p className="text-sm text-muted-foreground">Data de Emissão: {formatDate(quotation.createdAt)}</p>
            </div>

            {/* Client Info */}
            {quotation.showClientData && customer.name && (
              <div className="p-6 border-b border-border">
                <h3 className="font-semibold text-sm mb-2">Cliente:</h3>
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{customer.name}</p>
                  {customer.cnpj && (
                    <p><span className="text-muted-foreground">CNPJ:</span> {customer.cnpj}</p>
                  )}
                  {customer.address && (
                    <p><span className="text-muted-foreground">Endereço:</span> {customer.address}</p>
                  )}
                  {customer.phone && (
                    <p><span className="text-muted-foreground">Telefone:</span> {customer.phone}</p>
                  )}
                </div>
              </div>
            )}

            {/* Items Table */}
            <div className="p-6 border-b border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-primary text-primary-foreground">
                    <th className="px-4 py-2 text-left">Itens Orçados</th>
                    <th className="px-4 py-2 text-center">Tipo</th>
                    <th className="px-4 py-2 text-center">Un.</th>
                    <th className="px-4 py-2 text-center">Qtd.</th>
                    <th className="px-4 py-2 text-right">Valor Unit. (R$)</th>
                    <th className="px-4 py-2 text-right">Total (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.items.map((item, index) => (
                    <tr key={item.id} className={index % 2 === 0 ? 'bg-card' : 'bg-muted/20'}>
                      <td className="px-4 py-2 border-b border-border">
                        {item.product.name} {item.product.capacity}{item.product.unit}
                      </td>
                      <td className="px-4 py-2 border-b border-border text-center">
                        <Badge variant="secondary" className="text-xs">
                          {getProductTypeLabel(item.product.type)}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 border-b border-border text-center">Un.</td>
                      <td className="px-4 py-2 border-b border-border text-center">{item.quantity}</td>
                      <td className="px-4 py-2 border-b border-border text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-2 border-b border-border text-right">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="mt-4 flex justify-end">
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between border-b border-border pb-1">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(quotation.subtotal)}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-1">
                    <span>Desconto:</span>
                    <span>{formatCurrency(quotation.discount)}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-1">
                    <span>Frete:</span>
                    <span className={quotation.freight === 0 ? 'text-green-600 font-medium' : ''}>
                      {quotation.freight === 0 ? 'Grátis' : formatCurrency(quotation.freight)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-base bg-primary text-primary-foreground px-2 py-1 rounded">
                    <span>Total Geral:</span>
                    <span>{formatCurrency(quotation.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Conditions */}
            <div className="p-6 border-b border-border">
              <h3 className="font-semibold text-sm mb-2">Condições de Pagamento:</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                {paymentConditions.cashDiscount && (
                  <li>• À vista: {paymentConditions.cashDiscount}</li>
                )}
                {paymentConditions.installments && (
                  <li>• Parcelado: {paymentConditions.installments}</li>
                )}
                {paymentConditions.downPayment && (
                  <li>• Entrada mínima de {paymentConditions.downPayment}</li>
                )}
              </ul>
            </div>

            {/* Additional Info */}
            <div className="p-6 border-b border-border">
              <h3 className="font-semibold text-sm mb-2">Informações Adicionais:</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Prazo de entrega: {quotation.deliveryTime} após confirmação do pagamento.</li>
                <li>• Instalação realizada por equipe especializada.</li>
                <li>• Valores sujeitos a alteração sem aviso prévio.</li>
                {quotation.observations && <li>• {quotation.observations}</li>}
              </ul>
            </div>

            {/* Signature */}
            <div className="p-6">
              <p className="text-sm text-muted-foreground">Atenciosamente,</p>
              <p className="font-semibold text-sm mt-2">{companyInfo.sellerName || 'Vendedor'}</p>
              <p className="text-sm text-muted-foreground">{companyInfo.sellerRole || 'Consultor de Vendas'}</p>
              <p className="text-sm text-muted-foreground">{companyInfo.name}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 pt-0 flex flex-col sm:flex-row gap-3">
          <Button
            variant="fortlev"
            size="lg"
            onClick={() => {
              onDownloadPDF();
              onOpenChange(false);
            }}
            className="flex-1"
          >
            <FileText className="h-5 w-5" />
            Baixar PDF
          </Button>

          <Button
            variant="accent"
            size="lg"
            onClick={() => {
              onDownloadPNG();
              onOpenChange(false);
            }}
            className="flex-1"
          >
            <Image className="h-5 w-5" />
            Baixar PNG
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            <X className="h-5 w-5" />
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
