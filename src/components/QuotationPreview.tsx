import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import '@/styles/danfe-template.css';
import '@/styles/budget-template.css';
import { Button } from '@/components/ui/button';
import { Quotation } from '@/types/quotation';
import { formatCurrency } from '@/utils/formatters';
import { getBrazilDocumentLabel } from '@/utils/formatters';
import { FileText, Image, X, FileDown, Receipt, Eye, ShieldCheck, Copy, ExternalLink } from 'lucide-react';
import { FiscalStatusBadge } from './FiscalStatusBadge';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState, useRef, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface QuotationPreviewProps {
  quotation: Quotation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownloadPDF: () => void;
  onDownloadPNG: () => void;
  onDownloadDANFE: () => void;
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
  onDownloadDANFE,
}: QuotationPreviewProps) => {
  const [activeTab, setActiveTab] = useState<'budget' | 'danfe'>('budget');
  const [scale, setScale] = useState(1);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (previewRef.current && window.innerWidth < 800) {
        const containerWidth = previewRef.current.parentElement?.clientWidth || 0;
        const targetWidth = 800;
        const newScale = (containerWidth - 48) / targetWidth;
        setScale(Math.min(newScale, 1));
      } else {
        setScale(1);
      }
    };

    if (open) {
      window.addEventListener('resize', handleResize);
      setTimeout(handleResize, 100);
    }
    return () => window.removeEventListener('resize', handleResize);
  }, [open, activeTab]);

  if (!quotation) return null;

  const companyInfo = quotation.companyInfo || { name: '', cnpj: '', address: '', phone: '', email: '', website: '', sellerName: '', sellerRole: '' };
  const customer = quotation.customer || { name: '', cnpj: '', phone: '', address: '' };
  const paymentConditions = quotation.paymentConditions || { cashDiscount: '', installments: '', downPayment: '' };
  const branding = quotation.branding ?? { showBrand: true, brandText: 'FORTLEV' };
  const items = quotation.items || [];
  const formatDate = (date: Date | string | number) => {
    try {
      return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
    } catch (e) {
      return format(new Date(), "dd/MM/yyyy", { locale: ptBR });
    }
  };

  const barcodeRef = useRef<SVGSVGElement>(null);
  const qrCodeRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (activeTab === 'danfe' && quotation.fiscal?.accessKey && barcodeRef.current) {
      JsBarcode(barcodeRef.current, quotation.fiscal.accessKey, {
        format: "CODE128C",
        width: 1,
        height: 40,
        displayValue: false,
        margin: 0
      });
    }
  }, [activeTab, quotation.fiscal?.accessKey]);

  useEffect(() => {
    const generateQR = async () => {
      if (activeTab === 'danfe' && quotation.fiscal?.accessKey && quotation.fiscal?.portalToken && qrCodeRef.current) {
        const portalUrl = `${window.location.origin}/nota/${quotation.fiscal.accessKey}?token=${quotation.fiscal.portalToken}`;
        const qrDataUrl = await QRCode.toDataURL(portalUrl, { margin: 1, width: 100 });
        qrCodeRef.current.src = qrDataUrl;
      }
    };
    generateQR();
  }, [activeTab, quotation.fiscal?.accessKey, quotation.fiscal?.portalToken]);

  const isAuthorized = quotation.fiscal?.status === 'autorizada' || quotation.fiscal?.status === 'autorizada_fora_prazo';

  return (

    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0 border-none shadow-2xl">
        <DialogHeader className="p-6 pb-2 bg-muted/30">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Pré-visualização de Documentos
            </DialogTitle>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <FiscalStatusBadge status={quotation.fiscal?.status} className="hidden sm:flex" />
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full sm:w-auto">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="budget" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Orçamento
                  </TabsTrigger>
                  <TabsTrigger value="danfe" className="flex items-center gap-2">
                    <Receipt className="h-4 w-4" /> DANFE
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

          </div>
        </DialogHeader>

        <div className="p-4 sm:p-8 bg-gray-100/50 flex justify-center overflow-hidden">
          <div 
            ref={previewRef}
            className="transition-transform duration-200 ease-in-out"
            style={{ 
              transform: `scale(${scale})`, 
              transformOrigin: 'top center',
              width: '800px',
              height: scale < 1 ? `${1150 * scale}px` : 'auto'
            }}
          >
            {activeTab === 'budget' ? (
              <div className="quotation-card bg-white shadow-lg p-10 font-sans relative overflow-hidden text-[#1e1e1e]" style={{ width: '800px', minHeight: '1100px' }}>
                <div className="absolute top-0 left-0 w-full h-3 bg-[#004a97]"></div>
                
                <div className="flex justify-between items-start mb-10">
                  <div className="border-2 border-[#004a97] p-5 w-56 text-center rounded-sm">
                    {branding.showBrand && (
                      <>
                        <h2 className="text-[#004a97] text-3xl font-black italic tracking-tighter m-0">{branding.brandText || 'FORTLEV'}</h2>
                        <p className="text-[9px] text-[#004a97] font-bold mt-1 uppercase tracking-widest">Qualidade em primeiro lugar</p>
                      </>
                    )}
                  </div>
                  <div className="bg-[#f5f7fa] border border-[#004a97] p-5 w-64 text-center rounded-sm">
                    <p className="text-[#004a97] text-sm font-bold mb-1">ORÇAMENTO Nº {quotation.number}</p>
                    <p className="text-[#e71212] text-[11px] font-bold mb-1 uppercase">Válido até: {quotation.validity}</p>
                    <p className="text-[#1e1e1e] text-[10px]">Data de Emissão: {formatDate(quotation.createdAt)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div className="space-y-2">
                    <h3 className="text-[#004a97] text-xs font-bold border-bottom border-[#004a97] border-b pb-1 uppercase tracking-wider">Dados do Emissor</h3>
                    <div className="text-[11px] space-y-1">
                      <p className="font-bold text-sm">{companyInfo.name}</p>
                      <p><span className="font-bold">CNPJ:</span> {companyInfo.cnpj}</p>
                      <p><span className="font-bold">Endereço:</span> {companyInfo.address}</p>
                      <p><span className="font-bold">Fone:</span> {companyInfo.phone} | <span className="font-bold">E-mail:</span> {companyInfo.email}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-[#004a97] text-xs font-bold border-bottom border-[#004a97] border-b pb-1 uppercase tracking-wider">Dados do Cliente</h3>
                    <div className="text-[11px] space-y-1">
                      <p className="font-bold text-sm">{customer.name}</p>
                      <p><span className="font-bold">CNPJ/CPF:</span> {customer.cnpj}</p>
                      <p><span className="font-bold">Fone:</span> {customer.phone}</p>
                      <p><span className="font-bold">Endereço de Entrega:</span> {customer.address}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-10">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-[#004a97] text-white text-[10px] uppercase font-bold">
                        <th className="p-3 text-left border border-[#004a97]">Descrição dos Produtos / Serviços</th>
                        <th className="p-3 text-center border border-[#004a97] w-16">Qtd</th>
                        <th className="p-3 text-right border border-[#004a97] w-32">Vlr. Unitário</th>
                        <th className="p-3 text-right border border-[#004a97] w-32">Vlr. Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={item.id || idx} className="border-b border-gray-200 text-[11px]">
                          <td className="p-3 font-medium">{item.product?.name || 'Produto'} {item.product?.capacity > 0 ? `${item.product.capacity}${item.product.unit}` : ''}</td>
                          <td className="p-3 text-center">{item.quantity || 0}</td>
                          <td className="p-3 text-right">{formatCurrency(item.unitPrice || 0).replace('R$', '').trim()}</td>
                          <td className="p-3 text-right font-bold">{formatCurrency(item.subtotal || 0).replace('R$', '').trim()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end mb-10">
                  <div className="w-72 border-2 border-[#004a97] p-5 rounded-sm space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Subtotal dos Itens:</span>
                      <span>{formatCurrency(quotation.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-[#e71212]">
                      <span>(-) Descontos:</span>
                      <span>{formatCurrency(quotation.discount)}</span>
                    </div>
                    <div className="flex justify-between text-xs border-b border-gray-200 pb-2">
                      <span>(+) Valor do Frete:</span>
                      <span>{quotation.freight === 0 ? 'Grátis' : formatCurrency(quotation.freight)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-sm font-bold text-[#004a97]">TOTAL DO ORÇAMENTO:</span>
                      <span className="text-xl font-black text-[#e71212]">{formatCurrency(quotation.total)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-10">
                  <div className="space-y-3">
                    <h3 className="text-[#004a97] text-xs font-bold uppercase tracking-wider border-b border-[#004a97] pb-1">Condições de Pagamento</h3>
                    <div className="text-[10px] space-y-1 text-gray-700">
                      {paymentConditions.cashDiscount && <p>• À Vista: <span className="font-bold">{paymentConditions.cashDiscount}</span></p>}
                      {paymentConditions.installments && <p>• Cartão: <span className="font-bold">{paymentConditions.installments}</span></p>}
                      {paymentConditions.downPayment && <p>• Parcelamento: <span className="font-bold">{paymentConditions.downPayment}</span></p>}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-[#004a97] text-xs font-bold uppercase tracking-wider border-b border-[#004a97] pb-1">Informações Adicionais</h3>
                    <div className="text-[10px] space-y-1 text-gray-700">
                      <p>• Prazo de Entrega: <span className="font-bold">{quotation.deliveryTime}</span></p>
                      {quotation.observations && <p>• Observações: {quotation.observations}</p>}
                      <p>• Garantia oficial de fábrica conforme normas técnicas.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-20 flex flex-col items-center">
                  <div className="w-64 border-t border-gray-400 mb-2"></div>
                  <p className="text-[10px] font-bold uppercase">{companyInfo.sellerName || 'Departamento Comercial'}</p>
                  <p className="text-[9px] text-gray-500 uppercase">{companyInfo.sellerRole || 'Consultor de Vendas'}</p>
                </div>

                <div className="absolute bottom-0 left-0 w-full h-2 bg-[#004a97]"></div>
              </div>
            ) : (
              <div className="danfe-container bg-white shadow-lg p-2 font-mono uppercase leading-none text-black border border-gray-300 relative" style={{ width: '800px', minHeight: '1100px', fontSize: '8px' }}>
                {!isAuthorized && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] rotate-45">
                    <span className="text-8xl font-black text-red-600 border-8 border-red-600 p-8 whitespace-nowrap">SEM VALOR FISCAL</span>
                  </div>
                )}

                {/* Real DANFE structure for Preview */}
                <div className="border border-black p-1 mb-1">
                  <div className="grid grid-cols-12 gap-0 border-b border-black pb-1 mb-1">
                    <div className="col-span-10 border-r border-black pr-1">
                      <p className="text-[6px]">Recebemos de {companyInfo.name} os produtos constantes da nota fiscal eletrônica indicada abaixo.</p>
                      <div className="grid grid-cols-2 mt-4 gap-4">
                        <div className="border-t border-black pt-1">DATA DE RECEBIMENTO</div>
                        <div className="border-t border-black pt-1">IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR</div>
                      </div>
                    </div>
                    <div className="col-span-2 text-center flex flex-col justify-center">
                      <p className="font-bold text-sm">NF-E</p>
                      <p className="font-bold">Nº {quotation.fiscal?.invoiceNumber || "---.---.---"}</p>
                      <p className="font-bold">SÉRIE {quotation.fiscal?.series || "---"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-0 border-b border-black">
                    <div className="col-span-4 border-r border-black p-2 flex flex-col justify-center">
                      <h2 className="text-xl font-bold mb-1">{branding.brandText || 'FORTLEV'}</h2>
                      <p className="text-[7px] leading-tight font-bold">{companyInfo.name}</p>
                      <p className="text-[6px] leading-tight">{companyInfo.address}</p>
                      <p className="text-[6px]">Fone: {companyInfo.phone}</p>
                    </div>
                    <div className="col-span-3 border-r border-black p-1 text-center flex flex-col justify-center">
                      <h1 className="text-lg font-bold">DANFE</h1>
                      <p className="text-[6px]">Documento Auxiliar da</p>
                      <p className="text-[6px]">Nota Fiscal Eletrônica</p>
                      <div className="flex justify-center gap-2 mt-2">
                        <div className="border border-black p-1 text-[7px]">0-ENTRADA<br/>1-SAÍDA</div>
                        <div className="border border-black px-2 flex items-center font-bold text-lg">1</div>
                      </div>
                      <p className="font-bold mt-1 text-[8px]">Nº {quotation.fiscal?.invoiceNumber || "---.---.---"}</p>
                      <p className="font-bold text-[8px]">SÉRIE {quotation.fiscal?.series || "---"}</p>
                    </div>
                    <div className="col-span-5 p-1 flex flex-col justify-center">
                      {quotation.fiscal?.accessKey ? (
                        <div className="flex flex-col items-center">
                          <svg ref={barcodeRef} className="w-full h-10 mb-1"></svg>
                          <p className="text-[6px] font-bold">CHAVE DE ACESSO</p>
                          <p className="text-[8px] font-bold tracking-tighter">
                            {quotation.fiscal.accessKey.match(/.{1,4}/g)?.join(' ')}
                          </p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="text-[6px] font-bold">CHAVE DE ACESSO INDISPONÍVEL</p>
                        </div>
                      )}
                      <p className="text-[6px] mt-2 border-t border-black pt-1 text-center">Consulta de autenticidade no portal nacional da NF-e</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 border-b border-black">
                    <div className="col-span-8 border-r border-black p-1">
                      <p className="text-[5px]">NATUREZA DA OPERAÇÃO</p>
                      <p className="font-bold text-[8px]">VENDA DE MERCADORIA</p>
                    </div>
                    <div className="col-span-4 p-1">
                      <p className="text-[5px]">PROTOCOLO DE AUTORIZAÇÃO DE USO</p>
                      <p className="font-bold text-[8px]">
                        {isAuthorized ? `${quotation.fiscal?.protocol} - ${quotation.fiscal?.receiptAt ? formatDate(quotation.fiscal.receiptAt) : ''}` : "DOCUMENTO NÃO FISCAL"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 border-b border-black">
                    <div className="col-span-4 border-r border-black p-1">
                      <p className="text-[5px]">INSCRIÇÃO ESTADUAL</p>
                      <p className="font-bold">ISENTO</p>
                    </div>
                    <div className="col-span-4 border-r border-black p-1">
                      <p className="text-[5px]">INSCRIÇÃO ESTADUAL DO SUBST. TRIB.</p>
                    </div>
                    <div className="col-span-4 p-1">
                      <p className="text-[5px]">CNPJ</p>
                      <p className="font-bold">{companyInfo.cnpj}</p>
                    </div>
                  </div>

                  <div className="bg-gray-100 p-0.5 border-b border-black font-bold text-[7px]">DESTINATÁRIO / REMETENTE</div>
                  <div className="grid grid-cols-12 border-b border-black">
                    <div className="col-span-8 border-r border-black p-1">
                      <p className="text-[5px]">NOME / RAZÃO SOCIAL</p>
                      <p className="font-bold text-[8px]">{customer.name}</p>
                    </div>
                    <div className="col-span-2 border-r border-black p-1">
                      <p className="text-[5px]">CNPJ / CPF</p>
                      <p className="font-bold">{customer.cnpj}</p>
                    </div>
                    <div className="col-span-2 p-1">
                      <p className="text-[5px]">DATA DA EMISSÃO</p>
                      <p className="font-bold">{quotation.fiscal?.emissionAt ? formatDate(quotation.fiscal.emissionAt) : formatDate(quotation.createdAt)}</p>
                    </div>
                  </div>


                  <div className="bg-gray-100 p-0.5 border-b border-black font-bold text-[7px]">CÁLCULO DO IMPOSTO</div>
                  <div className="grid grid-cols-5 border-b border-black">
                    <div className="border-r border-black p-1 text-right">
                      <p className="text-[5px] text-left">BASE CÁLC. ICMS</p>
                      <p className="font-bold">{formatCurrency(quotation.subtotal).replace('R$', '')}</p>
                    </div>
                    <div className="border-r border-black p-1 text-right">
                      <p className="text-[5px] text-left">VALOR DO ICMS</p>
                      <p className="font-bold">0,00</p>
                    </div>
                    <div className="border-r border-black p-1 text-right">
                      <p className="text-[5px] text-left">BASE CÁLC. ICMS S.T.</p>
                      <p className="font-bold">0,00</p>
                    </div>
                    <div className="border-r border-black p-1 text-right">
                      <p className="text-[5px] text-left">VALOR DO ICMS S.T.</p>
                      <p className="font-bold">0,00</p>
                    </div>
                    <div className="p-1 text-right">
                      <p className="text-[5px] text-left">VLR. TOTAL PRODUTOS</p>
                      <p className="font-bold">{formatCurrency(quotation.subtotal).replace('R$', '')}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-5 border-b border-black">
                    <div className="border-r border-black p-1 text-right">
                      <p className="text-[5px] text-left">VALOR DO FRETE</p>
                      <p className="font-bold">{formatCurrency(quotation.freight).replace('R$', '')}</p>
                    </div>
                    <div className="border-r border-black p-1 text-right">
                      <p className="text-[5px] text-left">VALOR DO SEGURO</p>
                      <p className="font-bold">0,00</p>
                    </div>
                    <div className="border-r border-black p-1 text-right">
                      <p className="text-[5px] text-left">DESCONTO</p>
                      <p className="font-bold">{formatCurrency(quotation.discount).replace('R$', '')}</p>
                    </div>
                    <div className="border-r border-black p-1 text-right">
                      <p className="text-[5px] text-left">OUTRAS DESPESAS</p>
                      <p className="font-bold">0,00</p>
                    </div>
                    <div className="p-1 text-right bg-gray-50 border-l border-black">
                      <p className="text-[5px] text-left font-bold">VLR. TOTAL DA NOTA</p>
                      <p className="font-black text-xs">{formatCurrency(quotation.total).replace('R$', '')}</p>
                    </div>
                  </div>

                  <div className="bg-gray-100 p-0.5 border-b border-black font-bold text-[7px]">DADOS DO PRODUTO / SERVIÇO</div>
                  <div className="min-h-[300px]">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-black">
                          <th className="border-r border-black p-0.5 text-center w-8">CÓDIGO</th>
                          <th className="border-r border-black p-0.5 text-left">DESCRIÇÃO DO PRODUTO / SERVIÇO</th>
                          <th className="border-r border-black p-0.5 text-center w-10">NCM</th>
                          <th className="border-r border-black p-0.5 text-center w-6">CST</th>
                          <th className="border-r border-black p-0.5 text-center w-6">CFOP</th>
                          <th className="border-r border-black p-0.5 text-center w-6">UN</th>
                          <th className="border-r border-black p-0.5 text-right w-10">QTD</th>
                          <th className="border-r border-black p-0.5 text-right w-16">VLR.UNIT</th>
                          <th className="border-r border-black p-0.5 text-right w-16">VLR.TOT</th>
                          <th className="border-r border-black p-0.5 text-right w-14">BC.ICMS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quotation.items.map((item, i) => (
                          <tr key={i} className="border-b border-gray-100">
                            <td className="border-r border-black p-0.5 text-center">{i+1}</td>
                            <td className="border-r border-black p-0.5 font-bold">{item.product.name}</td>
                            <td className="border-r border-black p-0.5 text-center">39251000</td>
                            <td className="border-r border-black p-0.5 text-center">000</td>
                            <td className="border-r border-black p-0.5 text-center">5102</td>
                            <td className="border-r border-black p-0.5 text-center">UN</td>
                            <td className="border-r border-black p-0.5 text-right">{item.quantity}</td>
                            <td className="border-r border-black p-0.5 text-right">{formatCurrency(item.unitPrice).replace('R$', '')}</td>
                            <td className="border-r border-black p-0.5 text-right font-bold">{formatCurrency(item.subtotal).replace('R$', '')}</td>
                            <td className="border-r border-black p-0.5 text-right">0,00</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-gray-100 p-0.5 border-t border-b border-black font-bold text-[7px]">DADOS ADICIONAIS</div>
                  <div className="grid grid-cols-12 min-h-[60px]">
                    <div className="col-span-8 border-r border-black p-1">
                      <p className="text-[5px]">INFORMAÇÕES COMPLEMENTARES</p>
                      <p className="text-[6px] mt-1">{`Validade: ${quotation.validity} | Prazo: ${quotation.deliveryTime}`}</p>
                      <p className="text-[6px]">{quotation.observations}</p>
                    </div>
                    <div className="col-span-4 p-1">
                      <p className="text-[5px]">RESERVADO AO FISCO</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 pt-2 bg-muted/30 border-t flex flex-col sm:flex-row gap-3">
          <Button
            variant="default"
            size="lg"
            onClick={onDownloadPDF}
            className="flex-1 bg-[#004a97] hover:bg-[#003d7c] text-white"
          >
            <FileDown className="h-5 w-5 mr-2" />
            Baixar PDF Orçamento
          </Button>

          <Button
            variant="secondary"
            size="lg"
            onClick={onDownloadPNG}
            className="flex-1 bg-[#f5f7fa] border-[#004a97] text-[#004a97] hover:bg-[#e1e5eb]"
          >
            <Image className="h-5 w-5 mr-2" />
            Baixar PNG Orçamento
          </Button>

          <Button
            variant={isAuthorized ? "default" : "outline"}
            size="lg"
            onClick={onDownloadDANFE}
            className={`flex-1 ${isAuthorized ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-2 border-black font-bold hover:bg-black hover:text-white'} transition-colors`}
          >
            <Receipt className="h-5 w-5 mr-2" />
            {isAuthorized ? "Baixar DANFE Autorizada" : "Baixar Prévia DANFE"}
          </Button>


          <Button
            variant="ghost"
            size="lg"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            <X className="h-5 w-5 mr-2" />
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

