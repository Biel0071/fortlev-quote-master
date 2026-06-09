import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { Quotation, FiscalStatus } from '@/types/quotation';
import { formatCurrency, formatDate } from './formatters';
import { 
  calculateTotalTaxes, 
  getNcmCode, 
  DEFAULT_TAX_RATES 
} from './taxCalculator';

const formatAccessKey = (key: string): string => {
  return key.match(/.{1,4}/g)?.join(' ') || key;
};

const getStatusLabel = (status: FiscalStatus): string => {
  switch (status) {
    case 'autorizada': return 'AUTORIZADA NA SEFAZ';
    case 'autorizada_fora_prazo': return 'AUTORIZADA FORA DO PRAZO';
    case 'em_processamento': return 'EM PROCESSAMENTO';
    case 'cancelada': return 'NOTA CANCELADA';
    case 'rejeitada': return 'NOTA REJEITADA';
    case 'indisponivel': return 'FISCAL INDISPONÍVEL';
    default: return 'PRÉVIA SEM VALIDADE FISCAL';
  }
};

export const generateNFePDF = async (quotation: Quotation): Promise<jsPDF> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - (margin * 2);
  
  const fiscal = quotation.fiscal || {
    status: 'pre_visualizacao_sem_validade_fiscal' as FiscalStatus
  };

  const isAuthorized = fiscal.status === 'autorizada' || fiscal.status === 'autorizada_fora_prazo';
  
  // Professional black and white palette for DANFE
  const primaryBlack = [0, 0, 0] as const;
  const lightGray = [240, 240, 240] as const;
  
  let y = margin;

  // 1. RECEBIMENTO (CANHOTO) - AT THE TOP
  doc.setDrawColor(...primaryBlack);
  doc.rect(margin, y, contentWidth * 0.85, 15);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.text(`RECEBEMOS DE ${quotation.companyInfo.name || 'EMISSOR'} OS PRODUTOS E/OU SERVIÇOS CONSTANTES DA NOTA FISCAL ELETRÔNICA INDICADA ABAIXO.`, margin + 2, y + 4);
  doc.line(margin, y + 8, margin + contentWidth * 0.85, y + 8);
  doc.text('DATA DE RECEBIMENTO', margin + 2, y + 11);
  doc.text('IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR', margin + 40, y + 11);
  
  doc.rect(margin + contentWidth * 0.85, y, contentWidth * 0.15, 15);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('NF-e', margin + contentWidth * 0.85 + (contentWidth * 0.075), y + 5, { align: 'center' });
  doc.text(`Nº ${fiscal.invoiceNumber || '---.---.---'}`, margin + contentWidth * 0.85 + (contentWidth * 0.075), y + 10, { align: 'center' });
  doc.text(`SÉRIE ${fiscal.series || '---'}`, margin + contentWidth * 0.85 + (contentWidth * 0.075), y + 13, { align: 'center' });

  y += 18;

  // 2. IDENTIFICAÇÃO DO EMITENTE & DANFE
  // EMITENTE
  doc.rect(margin, y, contentWidth * 0.4, 32);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const emitName = doc.splitTextToSize(quotation.companyInfo.name || 'EMISSOR', (contentWidth * 0.4) - 4);
  doc.text(emitName, margin + 2, y + 6);
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  const companyAddr = doc.splitTextToSize(quotation.companyInfo.address || '', (contentWidth * 0.4) - 4);
  doc.text(companyAddr, margin + 2, y + 12);
  doc.text(`Fone/Fax: ${quotation.companyInfo.phone || ''}`, margin + 2, y + 28);

  // DANFE BLOCK
  doc.rect(margin + contentWidth * 0.4, y, contentWidth * 0.15, 32);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DANFE', margin + contentWidth * 0.475, y + 6, { align: 'center' });
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.text('Documento Auxiliar da', margin + contentWidth * 0.475, y + 10, { align: 'center' });
  doc.text('Nota Fiscal Eletrônica', margin + contentWidth * 0.475, y + 12, { align: 'center' });
  
  doc.rect(margin + contentWidth * 0.42, y + 15, contentWidth * 0.11, 8);
  doc.text('0-ENTRADA', margin + contentWidth * 0.43, y + 18);
  doc.text('1-SAÍDA', margin + contentWidth * 0.43, y + 21);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('1', margin + contentWidth * 0.51, y + 21);
  
  doc.setFontSize(7);
  doc.text(`Nº ${fiscal.invoiceNumber || '---.---.---'}`, margin + contentWidth * 0.475, y + 27, { align: 'center' });
  doc.text(`SÉRIE ${fiscal.series || '---'}`, margin + contentWidth * 0.475, y + 30, { align: 'center' });

  // BARCODE & KEY BLOCK
  doc.rect(margin + contentWidth * 0.55, y, contentWidth * 0.45, 32);
  
  if (fiscal.accessKey && fiscal.accessKey.length === 44) {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, fiscal.accessKey, {
      format: "CODE128C",
      width: 1.2,
      height: 40,
      displayValue: false,
      margin: 0
    });
    const barcodeImg = canvas.toDataURL("image/png");
    doc.addImage(barcodeImg, 'PNG', margin + contentWidth * 0.56, y + 2, contentWidth * 0.43, 12);
  } else {
    doc.setFontSize(6);
    doc.text('CHAVE DE ACESSO NÃO DISPONÍVEL', margin + contentWidth * 0.775, y + 8, { align: 'center' });
  }

  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.text('CHAVE DE ACESSO', margin + contentWidth * 0.56, y + 17);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(fiscal.accessKey ? formatAccessKey(fiscal.accessKey) : '--- ---- ---- ---- ---- ---- ---- ---- ---- ----', margin + contentWidth * 0.56, y + 21);
  
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('Consulta de autenticidade no portal nacional da NF-e', margin + contentWidth * 0.56, y + 26);
  doc.text('www.nfe.fazenda.gov.br/portal ou no site da Sefaz Autorizadora', margin + contentWidth * 0.56, y + 29);

  y += 32;

  // 3. NATUREZA DA OPERAÇÃO & PROTOCOLO
  doc.rect(margin, y, contentWidth * 0.55, 10);
  doc.setFontSize(5);
  doc.text('NATUREZA DA OPERAÇÃO', margin + 2, y + 3);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('VENDA DE MERCADORIA', margin + 2, y + 8);

  doc.rect(margin + contentWidth * 0.55, y, contentWidth * 0.45, 10);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.text('PROTOCOLO DE AUTORIZAÇÃO DE USO', margin + contentWidth * 0.56, y + 3);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  if (isAuthorized && fiscal.protocol) {
    const protoDate = fiscal.receiptAt ? formatDate(fiscal.receiptAt) : '';
    doc.text(`${fiscal.protocol} - ${protoDate}`, margin + contentWidth * 0.56, y + 8);
  } else {
    doc.text('DOCUMENTO NÃO FISCAL', margin + contentWidth * 0.56, y + 8);
  }

  y += 10;

  // 4. INSCRIÇÃO ESTADUAL & CNPJ
  doc.rect(margin, y, contentWidth * 0.33, 10);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.text('INSCRIÇÃO ESTADUAL', margin + 2, y + 3);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('ISENTO', margin + 2, y + 8);

  doc.rect(margin + contentWidth * 0.33, y, contentWidth * 0.33, 10);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.text('INSCRIÇÃO ESTADUAL DO SUBST. TRIB.', margin + contentWidth * 0.34, y + 3);

  doc.rect(margin + contentWidth * 0.66, y, contentWidth * 0.34, 10);
  doc.setFontSize(5);
  doc.text('CNPJ', margin + contentWidth * 0.67, y + 3);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(quotation.companyInfo.cnpj || '', margin + contentWidth * 0.67, y + 8);

  y += 12;

  // 5. DESTINATÁRIO
  doc.setFillColor(...lightGray);
  doc.rect(margin, y, contentWidth, 5, 'F');
  doc.rect(margin, y, contentWidth, 5, 'S');
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('DESTINATÁRIO / REMETENTE', margin + 2, y + 3.5);
  y += 5;

  doc.rect(margin, y, contentWidth * 0.7, 10);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.text('NOME / RAZÃO SOCIAL', margin + 2, y + 3);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(quotation.customer.name || '', margin + 2, y + 8);

  doc.rect(margin + contentWidth * 0.7, y, contentWidth * 0.15, 10);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.text('CNPJ / CPF', margin + contentWidth * 0.71, y + 3);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(quotation.customer.cnpj || '', margin + contentWidth * 0.71, y + 8);

  doc.rect(margin + contentWidth * 0.85, y, contentWidth * 0.15, 10);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.text('DATA DA EMISSÃO', margin + contentWidth * 0.86, y + 3);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(fiscal.emissionAt ? formatDate(fiscal.emissionAt) : formatDate(new Date()), margin + contentWidth * 0.86, y + 8);

  y += 10;

  doc.rect(margin, y, contentWidth * 0.5, 10);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.text('ENDEREÇO', margin + 2, y + 3);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  const custAddr = doc.splitTextToSize(quotation.customer.address || '', (contentWidth * 0.5) - 4);
  doc.text(custAddr, margin + 2, y + 7);

  doc.rect(margin + contentWidth * 0.5, y, contentWidth * 0.2, 10);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.text('BAIRRO / DISTRITO', margin + contentWidth * 0.51, y + 3);

  doc.rect(margin + contentWidth * 0.7, y, contentWidth * 0.15, 10);
  doc.setFontSize(5);
  doc.text('CEP', margin + contentWidth * 0.71, y + 3);

  doc.rect(margin + contentWidth * 0.85, y, contentWidth * 0.15, 10);
  doc.setFontSize(5);
  doc.text('DATA SAÍDA / ENTRADA', margin + contentWidth * 0.86, y + 3);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(fiscal.emissionAt ? formatDate(fiscal.emissionAt) : formatDate(new Date()), margin + contentWidth * 0.86, y + 8);

  y += 12;

  // 6. CÁLCULO DO IMPOSTO
  doc.setFillColor(...lightGray);
  doc.rect(margin, y, contentWidth, 5, 'F');
  doc.rect(margin, y, contentWidth, 5, 'S');
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('CÁLCULO DO IMPOSTO', margin + 2, y + 3.5);
  y += 5;

  const taxCalc = calculateTotalTaxes(quotation.items, DEFAULT_TAX_RATES);
  const col = contentWidth / 5;
  const taxLabels1 = ['BASE DE CÁLCULO DO ICMS', 'VALOR DO ICMS', 'BASE DE CÁLCULO ICMS S.T.', 'VALOR DO ICMS S.T.', 'VALOR TOTAL DOS PRODUTOS'];
  const taxValues1 = [
    formatCurrency(taxCalc.baseCalculo).replace('R$', ''),
    formatCurrency(taxCalc.icmsValue).replace('R$', ''),
    '0,00', '0,00',
    formatCurrency(quotation.subtotal).replace('R$', '')
  ];

  for (let i = 0; i < 5; i++) {
    doc.rect(margin + (i * col), y, col, 10);
    doc.setFontSize(4);
    doc.setFont('helvetica', 'normal');
    doc.text(taxLabels1[i], margin + (i * col) + 1, y + 3);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(taxValues1[i].trim(), margin + (i * col) + col - 2, y + 8, { align: 'right' });
  }
  y += 10;

  const taxLabels2 = ['VALOR DO FRETE', 'VALOR DO SEGURO', 'DESCONTO', 'OUTRAS DESPESAS ACESSÓRIAS', 'VALOR TOTAL DA NOTA'];
  const taxValues2 = [
    formatCurrency(quotation.freight || 0).replace('R$', ''),
    '0,00',
    formatCurrency(quotation.discount).replace('R$', ''),
    '0,00',
    formatCurrency(quotation.total).replace('R$', '')
  ];

  for (let i = 0; i < 5; i++) {
    doc.rect(margin + (i * col), y, col, 10);
    doc.setFontSize(4);
    doc.setFont('helvetica', 'normal');
    doc.text(taxLabels2[i], margin + (i * col) + 1, y + 3);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    if (i === 4) doc.setFontSize(8);
    doc.text(taxValues2[i].trim(), margin + (i * col) + col - 2, y + 8, { align: 'right' });
  }

  y += 12;

  // 7. TRANSPORTADOR / VOLUMES
  doc.setFillColor(...lightGray);
  doc.rect(margin, y, contentWidth, 5, 'F');
  doc.rect(margin, y, contentWidth, 5, 'S');
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('TRANSPORTADOR / VOLUMES TRANSPORTADOS', margin + 2, y + 3.5);
  y += 5;

  doc.rect(margin, y, contentWidth * 0.4, 8);
  doc.setFontSize(4);
  doc.setFont('helvetica', 'normal');
  doc.text('RAZÃO SOCIAL', margin + 1, y + 3);
  
  doc.rect(margin + contentWidth * 0.4, y, contentWidth * 0.15, 8);
  doc.text('FRETE POR CONTA', margin + contentWidth * 0.4 + 1, y + 3);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('0 - EMITENTE', margin + contentWidth * 0.4 + 1, y + 7);
  
  doc.rect(margin + contentWidth * 0.55, y, contentWidth * 0.1, 8);
  doc.setFontSize(4);
  doc.setFont('helvetica', 'normal');
  doc.text('CÓDIGO ANTT', margin + contentWidth * 0.55 + 1, y + 3);
  
  doc.rect(margin + contentWidth * 0.65, y, contentWidth * 0.15, 8);
  doc.text('PLACA DO VEÍCULO', margin + contentWidth * 0.65 + 1, y + 3);
  
  doc.rect(margin + contentWidth * 0.8, y, contentWidth * 0.05, 8);
  doc.text('UF', margin + contentWidth * 0.8 + 1, y + 3);
  
  doc.rect(margin + contentWidth * 0.85, y, contentWidth * 0.15, 8);
  doc.text('CNPJ / CPF', margin + contentWidth * 0.85 + 1, y + 3);

  y += 10;

  // 8. DADOS DO PRODUTO / SERVIÇO
  doc.setFillColor(...lightGray);
  doc.rect(margin, y, contentWidth, 5, 'F');
  doc.rect(margin, y, contentWidth, 5, 'S');
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DOS PRODUTOS / SERVIÇOS', margin + 2, y + 3.5);
  y += 5;

  const tableData = (quotation.items || []).map((item, index) => [
    (index + 1).toString().padStart(3, '0'),
    (item.product?.name || 'Produto') + (item.product?.capacity > 0 ? ` ${item.product.capacity}${item.product.unit}` : ''),
    getNcmCode(item.product?.type || 'caixa'),
    '000', '5102', 'UN', (item.quantity || 0).toString(),
    formatCurrency(item.unitPrice || 0).replace('R$', '').trim(),
    formatCurrency(item.subtotal || 0).replace('R$', '').trim(),
    '0,00', '0,00', '0,00'
  ]);

  autoTable(doc, {
    startY: y,
    head: [['CÓD', 'DESCRIÇÃO', 'NCM', 'CST', 'CFOP', 'UN', 'QTD', 'VL.UNIT', 'VL.TOT', 'BC ICMS', 'VL.ICMS', '%ICMS']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 5, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.1, font: 'helvetica' },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    margin: { left: margin, right: margin }
  });

  y = (doc as any).lastAutoTable.finalY + 5;

  // 9. DADOS ADICIONAIS
  doc.setFillColor(...lightGray);
  doc.rect(margin, y, contentWidth, 5, 'F');
  doc.rect(margin, y, contentWidth, 5, 'S');
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS ADICIONAIS', margin + 2, y + 3.5);
  y += 5;

  // INFORMAÇÕES COMPLEMENTARES
  doc.rect(margin, y, contentWidth * 0.75, 25);
  doc.setFontSize(4);
  doc.setFont('helvetica', 'normal');
  doc.text('INFORMAÇÕES COMPLEMENTARES', margin + 1, y + 3);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text(getStatusLabel(fiscal.status), margin + 1, y + 7);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  const obs = `Validade: ${quotation.validity} | Entrega: ${quotation.deliveryTime} | ${quotation.observations || ''}`;
  const splitObs = doc.splitTextToSize(obs, (contentWidth * 0.75) - 4);
  doc.text(splitObs, margin + 1, y + 10);

  // QR CODE BLOCK - INTERNAL PORTAL
  doc.rect(margin + contentWidth * 0.75, y, contentWidth * 0.25, 25);
  doc.setFontSize(4);
  doc.text('CONSULTA NO PORTAL DO EMITENTE', margin + contentWidth * 0.75 + 1, y + 3);
  
  if (fiscal.accessKey && fiscal.portalToken) {
    const portalUrl = `${window.location.origin}/nota/${fiscal.accessKey}?token=${fiscal.portalToken}`;
    const qrDataUrl = await QRCode.toDataURL(portalUrl, { margin: 1, width: 80 });
    doc.addImage(qrDataUrl, 'PNG', margin + contentWidth * 0.82, y + 4, 18, 18);
    doc.setFontSize(4);
    doc.text('Escaneie para validar no portal', margin + contentWidth * 0.875, y + 23, { align: 'center' });
  } else {
    doc.setFontSize(5);
    doc.text('QR CODE INDISPONÍVEL', margin + contentWidth * 0.875, y + 13, { align: 'center' });
  }

  // 10. PAGE WATERMARK IF NOT AUTHORIZED
  if (!isAuthorized) {
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
    doc.setFontSize(60);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(200, 0, 0);
    doc.text('SEM VALOR FISCAL', pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });
    doc.restoreGraphicsState();
  }

  return doc;
};

export const downloadNFePDF = async (quotation: Quotation) => {
  const doc = await generateNFePDF(quotation);
  const fileName = quotation.fiscal?.invoiceNumber ? `danfe-${quotation.fiscal.invoiceNumber}.pdf` : `danfe-previa-${quotation.number}.pdf`;
  doc.save(fileName);
};
