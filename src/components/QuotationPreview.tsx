import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Quotation } from '@/types/quotation';
import { formatCurrency } from '@/utils/formatters';
import { getBrazilDocumentLabel } from '@/utils/formatters';
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
          <div className="bg-white border-2 border-black text-black font-mono text-[9px] uppercase leading-tight p-1">
            {/* Canhoto de Recebimento */}
            <div className="grid grid-cols-12 border-b-2 border-black mb-1 h-12">
              <div className="col-span-10 border-r-2 border-black p-1">
                <p className="text-[6px]">RECEBEMOS DE {companyInfo.name} OS PRODUTOS/SERVIÇOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO</p>
                <div className="grid grid-cols-2 mt-2 gap-4">
                  <div className="border-t border-black pt-1">DATA DE RECEBIMENTO</div>
                  <div className="border-t border-black pt-1">IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR</div>
                </div>
              </div>
              <div className="col-span-2 p-1 flex flex-col items-center justify-center text-center">
                <p className="font-bold text-xs">NF-e</p>
                <p className="font-bold">Nº {quotation.number}</p>
                <p className="font-bold text-[7px]">SÉRIE: 001</p>
              </div>
            </div>

            {/* DANFE Header */}
            <div className="grid grid-cols-12 border-b-2 border-black">
              <div className="col-span-3 border-r-2 border-black p-2 flex flex-col justify-center items-center text-center">
                {branding.showBrand && (
                  <h2 className="text-lg font-bold mb-1">{branding.brandText || 'FORTLEV'}</h2>
                )}
                <div className="text-[7px] font-bold">
                  <p>{companyInfo.name}</p>
                  <p>{companyInfo.address}</p>
                  <p>FONE: {companyInfo.phone}</p>
                </div>
              </div>
              <div className="col-span-4 border-r-2 border-black p-2 flex flex-col items-center justify-center text-center">
                <h1 className="text-sm font-bold mb-1">DANFE</h1>
                <p className="text-[7px]">DOCUMENTO AUXILIAR DA</p>
                <p className="text-[7px]">NOTA FISCAL ELETRÔNICA</p>
                <div className="mt-2 grid grid-cols-2 w-full gap-1 text-[7px]">
                  <div className="border border-black p-1 text-center">
                    <p>0 - ENTRADA</p>
                    <p>1 - SAÍDA</p>
                  </div>
                  <div className="border border-black flex items-center justify-center text-lg font-bold">
                    1
                  </div>
                </div>
                <p className="mt-1 font-bold">Nº {quotation.number}</p>
                <p className="font-bold">SÉRIE: 001</p>
                <p className="text-[7px]">FOLHA 1/1</p>
              </div>
              <div className="col-span-5 p-2 overflow-hidden">
                <p className="text-[7px] mb-1">CONTROLE DO FISCO</p>
                <div className="h-10 bg-black mb-1 w-full flex items-center justify-center text-white text-[6px] tracking-[5px]">|||||||||||||||||||||||||||||||||||||||||||||||</div>
                <p className="text-[7px] font-bold break-all">CHAVE DE ACESSO</p>
                <p className="text-[8px] font-bold break-all">3326 0509 5436 9900 0112 5500 1000 00{quotation.number} 1095 4369 9712</p>
                <p className="text-[8px] mt-2 text-center border-t border-black pt-1">Consulta de autenticidade no portal nacional da NF-e</p>
              </div>
            </div>

            {/* Natureza da Operação */}
            <div className="grid grid-cols-12 border-b-2 border-black">
              <div className="col-span-8 border-r-2 border-black p-1">
                <p className="text-[7px]">NATUREZA DA OPERAÇÃO</p>
                <p className="font-bold">VENDA DE MERCADORIA</p>
              </div>
              <div className="col-span-4 p-1">
                <p className="text-[7px]">PROTOCOLO DE AUTORIZAÇÃO DE USO</p>
                <p className="font-bold">133260005436997 - {formatDate(quotation.createdAt)}</p>
              </div>
            </div>

            {/* Inscrições */}
            <div className="grid grid-cols-12 border-b-2 border-black">
              <div className="col-span-4 border-r-2 border-black p-1">
                <p className="text-[7px]">INSCRIÇÃO ESTADUAL</p>
                <p className="font-bold">09.543.699-7</p>
              </div>
              <div className="col-span-4 border-r-2 border-black p-1">
                <p className="text-[7px]">INSCRIÇÃO ESTADUAL DO SUBST. TRIB.</p>
                <p className="font-bold">---</p>
              </div>
              <div className="col-span-4 p-1">
                <p className="text-[7px]">CNPJ</p>
                <p className="font-bold">{companyInfo.cnpj || '09.543.699/0001-12'}</p>
              </div>
            </div>

            {/* Destinatário/Remetente */}
            <div className="border-b-2 border-black px-1 font-bold text-[8px]">DESTINATÁRIO / REMETENTE</div>
            <div className="grid grid-cols-12 border-b-2 border-black">
              <div className="col-span-8 border-r-2 border-black p-1">
                <p className="text-[7px]">NOME / RAZÃO SOCIAL</p>
                <p className="font-bold">{customer.name || 'CONSUMIDOR FINAL'}</p>
              </div>
              <div className="col-span-2 border-r-2 border-black p-1">
                <p className="text-[7px]">CNPJ / CPF</p>
                <p className="font-bold">{customer.cnpj}</p>
              </div>
              <div className="col-span-2 p-1">
                <p className="text-[7px]">DATA DA EMISSÃO</p>
                <p className="font-bold">{formatDate(quotation.createdAt)}</p>
              </div>
            </div>
            <div className="grid grid-cols-12 border-b-2 border-black">
              <div className="col-span-6 border-r-2 border-black p-1">
                <p className="text-[7px]">ENDEREÇO</p>
                <p className="font-bold">{customer.address || 'RUA PEDRO ERNESTO, 95'}</p>
              </div>
              <div className="col-span-3 border-r-2 border-black p-1">
                <p className="text-[7px]">BAIRRO / DISTRITO</p>
                <p className="font-bold">GAMBOA</p>
              </div>
              <div className="col-span-2 border-r-2 border-black p-1">
                <p className="text-[7px]">CEP</p>
                <p className="font-bold">20220-530</p>
              </div>
              <div className="col-span-1 p-1">
                <p className="text-[7px]">DATA SAÍDA</p>
                <p className="font-bold">{formatDate(quotation.createdAt)}</p>
              </div>
            </div>
            <div className="grid grid-cols-12 border-b-2 border-black">
              <div className="col-span-4 border-r-2 border-black p-1">
                <p className="text-[7px]">MUNICÍPIO</p>
                <p className="font-bold">RIO DE JANEIRO</p>
              </div>
              <div className="col-span-1 border-r-2 border-black p-1 text-center">
                <p className="text-[7px]">UF</p>
                <p className="font-bold">RJ</p>
              </div>
              <div className="col-span-3 border-r-2 border-black p-1">
                <p className="text-[7px]">FONE / FAX</p>
                <p className="font-bold">{customer.phone}</p>
              </div>
              <div className="col-span-3 border-r-2 border-black p-1">
                <p className="text-[7px]">INSCRIÇÃO ESTADUAL</p>
                <p className="font-bold">ISENTO</p>
              </div>
              <div className="col-span-1 p-1">
                <p className="text-[7px]">HORA SAÍDA</p>
                <p className="font-bold">{format(new Date(), 'HH:mm')}</p>
              </div>
            </div>

            {/* Cálculo do Imposto */}
            <div className="border-b-2 border-black px-1 font-bold text-[8px]">CÁLCULO DO IMPOSTO</div>
            <div className="grid grid-cols-5 border-b-2 border-black">
              <div className="border-r-2 border-black p-1">
                <p className="text-[7px]">BASE DE CÁLCULO DO ICMS</p>
                <p className="font-bold text-right">{formatCurrency(quotation.taxes?.icmsBase || 0)}</p>
              </div>
              <div className="border-r-2 border-black p-1">
                <p className="text-[7px]">VALOR DO ICMS</p>
                <p className="font-bold text-right">{formatCurrency(quotation.taxes?.icmsValue || 0)}</p>
              </div>
              <div className="border-r-2 border-black p-1">
                <p className="text-[7px]">BASE DE CÁLC. ICMS S.T.</p>
                <p className="font-bold text-right">R$ 0,00</p>
              </div>
              <div className="border-r-2 border-black p-1">
                <p className="text-[7px]">VALOR DO ICMS S.T.</p>
                <p className="font-bold text-right">R$ 0,00</p>
              </div>
              <div className="p-1">
                <p className="text-[7px]">VALOR TOTAL DOS PRODUTOS</p>
                <p className="font-bold text-right">{formatCurrency(quotation.subtotal)}</p>
              </div>
            </div>
            <div className="grid grid-cols-5 border-b-2 border-black">
              <div className="border-r-2 border-black p-1">
                <p className="text-[7px]">VALOR DO FRETE</p>
                <p className="font-bold text-right">{formatCurrency(quotation.freight)}</p>
              </div>
              <div className="border-r-2 border-black p-1">
                <p className="text-[7px]">VALOR DO SEGURO</p>
                <p className="font-bold text-right">R$ 0,00</p>
              </div>
              <div className="border-r-2 border-black p-1">
                <p className="text-[7px]">DESCONTO</p>
                <p className="font-bold text-right">{formatCurrency(quotation.discount)}</p>
              </div>
              <div className="border-r-2 border-black p-1">
                <p className="text-[7px]">OUTRAS DESPESAS</p>
                <p className="font-bold text-right">R$ 0,00</p>
              </div>
              <div className="p-1 border-2 border-black">
                <p className="text-[7px] font-bold">VALOR TOTAL DA NOTA</p>
                <p className="font-extrabold text-sm text-right">{formatCurrency(quotation.total)}</p>
              </div>
            </div>

            {/* Dados do Produto/Serviço */}
            <div className="border-b-2 border-black px-1 font-bold text-[8px]">DADOS DO PRODUTO / SERVIÇO</div>
            <div className="min-h-[150px]">
              <table className="w-full text-[7px] border-collapse">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="border-r border-black p-1 text-left w-12">CÓDIGO</th>
                    <th className="border-r border-black p-1 text-left">DESCRIÇÃO DO PRODUTO / SERVIÇO</th>
                    <th className="border-r border-black p-1 text-center w-8">NCM</th>
                    <th className="border-r border-black p-1 text-center w-8">CST</th>
                    <th className="border-r border-black p-1 text-center w-8">CFOP</th>
                    <th className="border-r border-black p-1 text-center w-6">UNID</th>
                    <th className="border-r border-black p-1 text-right w-10">QTD</th>
                    <th className="border-r border-black p-1 text-right w-16">VLR.UNIT</th>
                    <th className="border-r border-black p-1 text-right w-16">VLR.TOTAL</th>
                    <th className="border-r border-black p-1 text-right w-12">BC.ICMS</th>
                    <th className="border-r border-black p-1 text-right w-12">VLR.ICMS</th>
                    <th className="p-1 text-right w-8">%ICMS</th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-300">
                      <td className="border-r border-black p-1">{item.product.id.slice(0, 8)}</td>
                      <td className="border-r border-black p-1 font-bold">
                        {item.product.name} {item.product.capacity}{item.product.unit} - {getProductTypeLabel(item.product.type)}
                      </td>
                      <td className="border-r border-black p-1 text-center">39251000</td>
                      <td className="border-r border-black p-1 text-center">000</td>
                      <td className="border-r border-black p-1 text-center">5102</td>
                      <td className="border-r border-black p-1 text-center">UN</td>
                      <td className="border-r border-black p-1 text-right">{item.quantity}</td>
                      <td className="border-r border-black p-1 text-right">{formatCurrency(item.unitPrice).replace('R$', '').trim()}</td>
                      <td className="border-r border-black p-1 text-right font-bold">{formatCurrency(item.subtotal).replace('R$', '').trim()}</td>
                      <td className="border-r border-black p-1 text-right">0,00</td>
                      <td className="border-r border-black p-1 text-right">0,00</td>
                      <td className="p-1 text-right">0,00</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Dados Adicionais */}
            <div className="bg-gray-100 border-t-2 border-b-2 border-black px-1 font-bold text-[8px]">DADOS ADICIONAIS</div>
            <div className="grid grid-cols-12">
              <div className="col-span-8 border-r-2 border-black p-1 min-h-[60px]">
                <p className="text-[7px]">INFORMAÇÕES COMPLEMENTARES</p>
                <div className="text-[7px] space-y-1">
                  <p>CONDIÇÕES DE PAGAMENTO: {paymentConditions.cashDiscount ? `À VISTA: ${paymentConditions.cashDiscount}` : ''} 
                  {paymentConditions.installments ? ` | PARCELADO: ${paymentConditions.installments}` : ''}</p>
                  <p>VALIDADE DO ORÇAMENTO: {quotation.validity}</p>
                  <p>PRAZO DE ENTREGA: {quotation.deliveryTime}</p>
                  {quotation.observations && <p>OBSERVAÇÕES: {quotation.observations}</p>}
                  <p className="mt-2 font-bold">VENDEDOR: {companyInfo.sellerName || 'NÃO INFORMADO'}</p>
                </div>
              </div>
              <div className="col-span-4 p-1">
                <p className="text-[7px]">RESERVADO AO FISCO</p>
              </div>
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
