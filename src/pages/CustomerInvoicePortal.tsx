import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Quotation } from "@/types/quotation";
import { FiscalStatusBadge } from "@/components/FiscalStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { downloadNFePDF } from "@/utils/nfeGenerator";
import { 
  FileText, 
  Download, 
  Copy, 
  ExternalLink, 
  Loader2, 
  AlertCircle,
  Package,
  User,
  Building2,
  Calendar,
  Hash,
  ShieldCheck
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

export const CustomerInvoicePortal = () => {
  const { accessKey } = useParams();
  const [searchParams] = useSearchParams();
  const portalToken = searchParams.get("token");
  
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuotation = async () => {
      if (!accessKey) return;

      try {
        setLoading(true);
        setError(null);

        // Try to find in fortlev_quotations first
        let { data, error: fetchError } = await supabase
          .from("fortlev_quotations")
          .select("*")
          .eq("access_key", accessKey)
          .single();

        if (fetchError || !data) {
          // Try construction_quotations
          const { data: cData, error: cError } = await supabase
            .from("construction_quotations")
            .select("*")
            .eq("access_key", accessKey)
            .single();
          
          if (cError || !cData) {
            setError("Documento não encontrado ou chave de acesso inválida.");
            setLoading(false);
            return;
          }
          data = cData;
        }

        // Validate token
        if (data.portal_token !== portalToken) {
          setError("Acesso negado. O token de consulta é inválido ou expirou.");
          setLoading(false);
          return;
        }

        if (!data) return;

        // Map data to Quotation type
        const mapped: Quotation = {
          id: data.id,
          number: data.number,
          customer: data.customer_json as any,
          companyInfo: data.company_info_json as any,
          items: data.items_json as any,
          subtotal: Number(data.subtotal),
          discount: Number(data.discount),
          freight: Number(data.freight),
          total: Number(data.total),
          validity: data.validity,
          observations: data.observations,
          paymentConditions: (data.payment_conditions_json || { installments: (data as any).payment_method || "" }) as any,
          deliveryTime: data.delivery_time || (data as any).delivery_date || "",
          showClientData: data.show_client_data,
          createdAt: new Date(data.created_at),
          status: data.status as any,
          fiscal: {
            status: data.fiscal_status as any,

            accessKey: data.access_key,
            invoiceNumber: data.invoice_number,
            series: data.series,
            protocol: data.protocol,
            emissionAt: data.emission_at ? new Date(data.emission_at) : undefined,
            receiptAt: data.receipt_at ? new Date(data.receipt_at) : undefined,
            cStat: data.c_stat,
            xmlContent: data.xml_content,
            xmlHash: data.xml_hash,
            portalToken: data.portal_token
          }
        };

        setQuotation(mapped);
      } catch (err) {
        console.error("Portal error:", err);
        setError("Ocorreu um erro ao carregar as informações.");
      } finally {
        setLoading(false);
      }
    };

    fetchQuotation();
  }, [accessKey, portalToken]);

  const copyKey = () => {
    if (accessKey) {
      navigator.clipboard.writeText(accessKey);
      toast({ title: "Copiado!", description: "Chave de acesso copiada para a área de transferência." });
    }
  };

  const openOfficialPortal = () => {
    window.open("https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=completa", "_blank");
  };

  const downloadXML = () => {
    if (quotation?.fiscal?.xmlContent) {
      const blob = new Blob([quotation.fiscal.xmlContent], { type: 'text/xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `nfe-${quotation.fiscal.accessKey}.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      toast({ title: "XML Indisponível", description: "O arquivo XML ainda não foi gerado ou autorizado.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-600 font-medium">Carregando informações fiscais...</p>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50 text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Ops! Algo deu errado</h1>
        <p className="text-gray-600 max-w-md mb-6">{error || "Não foi possível carregar as informações deste documento."}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const isAuthorized = quotation.fiscal?.status === 'autorizada' || quotation.fiscal?.status === 'autorizada_fora_prazo';

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="text-blue-600" /> Portal de Documentos Fiscais
            </h1>
            <p className="text-slate-500">Consulte o status e baixe seus documentos oficiais</p>
          </div>
          <div className="flex items-center gap-2">
            <FiscalStatusBadge status={quotation.fiscal?.status} className="text-sm py-1 px-3" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-slate-400" /> Detalhes da Nota Fiscal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-semibold">Número</p>
                    <p className="font-medium text-slate-900">{quotation.fiscal?.invoiceNumber || "---"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-semibold">Série</p>
                    <p className="font-medium text-slate-900">{quotation.fiscal?.series || "---"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-semibold">Protocolo</p>
                    <p className="font-medium text-slate-900">{quotation.fiscal?.protocol || "---"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-semibold">Emissão</p>
                    <p className="font-medium text-slate-900">{quotation.fiscal?.emissionAt ? formatDate(quotation.fiscal.emissionAt) : "---"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-semibold">Autorização</p>
                    <p className="font-medium text-slate-900">{quotation.fiscal?.receiptAt ? formatDate(quotation.fiscal.receiptAt) : "---"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-semibold">Valor Total</p>
                    <p className="font-bold text-slate-900">{formatCurrency(quotation.total)}</p>
                  </div>
                </div>

                <Separator className="my-2" />

                <div className="space-y-1">
                  <p className="text-xs text-slate-400 uppercase font-semibold">Chave de Acesso</p>
                  <div className="flex items-center gap-2 bg-slate-100 p-2 rounded border border-slate-200">
                    <span className="font-mono text-sm break-all text-slate-700 tracking-wider">
                      {quotation.fiscal?.accessKey || "---"}
                    </span>
                    <button onClick={copyKey} className="shrink-0 text-slate-400 hover:text-blue-600 transition-colors">
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Consulte este documento no Portal Nacional da NF-e usando a chave acima.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-slate-400" /> Itens do Documento
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-100 min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Descrição</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Qtd</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {quotation.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-sm text-slate-900 font-medium">
                            {item.product.name} {item.product.capacity > 0 ? `${item.product.capacity}${item.product.unit}` : ""}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 text-center">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm text-slate-900 text-right">{formatCurrency(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50 flex justify-between items-center py-3">
                <span className="text-sm font-semibold text-slate-600">Total</span>
                <span className="text-lg font-bold text-slate-900">{formatCurrency(quotation.total)}</span>
              </CardFooter>
            </Card>
          </div>

          {/* Sidebar Actions */}
          <div className="space-y-6">
            <Card className="shadow-sm border-slate-200 bg-blue-50 border-blue-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-blue-900">Ações do Documento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <button 
                  onClick={() => downloadNFePDF(quotation)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm font-medium"
                >
                  <Download className="h-4 w-4" /> Baixar DANFE (PDF)
                </button>
                <button 
                  onClick={downloadXML}
                  disabled={!quotation.fiscal?.xmlContent}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileText className="h-4 w-4" /> Baixar XML
                </button>
                <button 
                  onClick={openOfficialPortal}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors font-medium"
                >
                  <ExternalLink className="h-4 w-4" /> Portal Nacional NF-e
                </button>
              </CardContent>
              {isAuthorized && (
                <CardFooter className="pt-0">
                  <div className="bg-green-100 text-green-700 p-3 rounded-md w-full flex items-start gap-2 border border-green-200">
                    <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-tight">
                      Este documento é uma representação gráfica de uma NF-e autorizada e válida legalmente.
                    </p>
                  </div>
                </CardFooter>
              )}
            </Card>

            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Informações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Building2 className="h-4 w-4 text-slate-400 mt-1" />
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-semibold">Emitente</p>
                    <p className="text-sm font-medium text-slate-900">{quotation.companyInfo.name}</p>
                    <p className="text-[11px] text-slate-500">CNPJ: {quotation.companyInfo.cnpj}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-slate-400 mt-1" />
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-semibold">Destinatário</p>
                    <p className="text-sm font-medium text-slate-900">{quotation.customer.name}</p>
                    <p className="text-[11px] text-slate-500">CNPJ/CPF: {quotation.customer.cnpj}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-slate-400 mt-1" />
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-semibold">Data da Operação</p>
                    <p className="text-sm font-medium text-slate-900">{formatDate(quotation.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Hash className="h-4 w-4 text-slate-400 mt-1" />
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-semibold">Nº Orçamento</p>
                    <p className="text-sm font-medium text-slate-900">{quotation.number}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-slate-400 text-xs">
          <p>© {new Date().getFullYear()} {quotation.companyInfo.name} - Sistema de Gestão de Documentos Fiscais</p>
          <p className="mt-1">Desenvolvido com tecnologia de ponta para sua segurança fiscal.</p>
        </div>
      </div>
    </div>
  );
};
