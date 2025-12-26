import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Quotation } from '@/types/quotation';
import { formatCurrency, formatDate } from './formatters';
import { 
  calculateTotalTaxes, 
  getProductFullDescription, 
  getNcmCode, 
  getCfopCode,
  CST_CODES,
  DEFAULT_TAX_RATES 
} from './taxCalculator';

// Generate access key (simulated - in real scenario would be from SEFAZ)
const generateAccessKey = (): string => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  
  // Format: UF + AAMM + CNPJ + mod + serie + numero + tpEmis + codigo + DV
  const parts = [
    '35', // SP
    year + month,
    '00000000000000'.slice(0, 14), // CNPJ placeholder
    '55', // Modelo NFe
    '001', // Série
    Math.random().toString().slice(2, 11).padStart(9, '0'),
    '1', // Tipo emissão
    Math.random().toString().slice(2, 10).padStart(8, '0'),
  ];
  
  const keyWithoutDV = parts.join('');
  const dv = calculateDV(keyWithoutDV);
  
  return keyWithoutDV + dv;
};

// Simple DV calculation (module 11)
const calculateDV = (key: string): string => {
  const weights = [2, 3, 4, 5, 6, 7, 8, 9];
  let sum = 0;
  let weightIndex = 0;
  
  for (let i = key.length - 1; i >= 0; i--) {
    sum += parseInt(key[i]) * weights[weightIndex % 8];
    weightIndex++;
  }
  
  const rest = sum % 11;
  const dv = rest < 2 ? 0 : 11 - rest;
  return dv.toString();
};

// Format access key with spaces
const formatAccessKey = (key: string): string => {
  return key.match(/.{1,4}/g)?.join(' ') || key;
};

export const generateNFePDF = (quotation: Quotation, nfeNumber: string): jsPDF => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Colors
  const black = [0, 0, 0] as const;
  const white = [255, 255, 255] as const;
  const lightGray = [240, 240, 240] as const;
  const textDark = [30, 30, 30] as const;
  
  const accessKey = generateAccessKey();
  const protocolNumber = Math.floor(Math.random() * 999999999999).toString().padStart(15, '0');
  const emissionDate = formatDate(new Date());
  const emissionTime = new Date().toLocaleTimeString('pt-BR');
  
  // Calculate taxes
  const taxCalc = calculateTotalTaxes(quotation.items, DEFAULT_TAX_RATES);
  
  let yPos = 8;
  
  // ===================== RECEIPT SECTION (top) =====================
  doc.setDrawColor(...black);
  doc.setLineWidth(0.3);
  
  // Receipt box
  doc.rect(10, yPos, pageWidth - 45, 18);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`RECEBEMOS DE ${quotation.companyInfo?.name || 'EMPRESA EMITENTE'} OS PRODUTOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO`, 12, yPos + 5);
  
  doc.setFontSize(6);
  doc.text('Data de recebimento', 12, yPos + 12);
  doc.text('Identificação e assinatura do recebedor', 60, yPos + 12);
  
  // NFe number box (right side)
  doc.rect(pageWidth - 33, yPos, 23, 18);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('NF-e', pageWidth - 21.5, yPos + 6, { align: 'center' });
  doc.setFontSize(9);
  doc.text(`Nº ${nfeNumber}`, pageWidth - 21.5, yPos + 12, { align: 'center' });
  doc.setFontSize(7);
  doc.text('Série 1', pageWidth - 21.5, yPos + 16, { align: 'center' });
  
  yPos += 22;
  
  // ===================== HEADER SECTION =====================
  doc.rect(10, yPos, pageWidth - 20, 35);
  
  // Company info (left column)
  const leftColWidth = 70;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(quotation.companyInfo?.name || 'EMPRESA EMITENTE', 15, yPos + 8);
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  if (quotation.companyInfo?.address) {
    doc.text(quotation.companyInfo.address, 15, yPos + 14);
  }
  if (quotation.companyInfo?.phone) {
    doc.text(`Fone: ${quotation.companyInfo.phone}`, 15, yPos + 20);
  }
  if (quotation.companyInfo?.email) {
    doc.text(quotation.companyInfo.email, 15, yPos + 26);
  }
  if (quotation.companyInfo?.website) {
    doc.text(quotation.companyInfo.website, 15, yPos + 32);
  }
  
  // DANFE section (center)
  const centerX = 85;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('DANFE', centerX + 10, yPos + 8);
  
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('Documento Auxiliar', centerX, yPos + 13);
  doc.text('da Nota Fiscal', centerX, yPos + 17);
  doc.text('Eletrônica', centerX, yPos + 21);
  
  // Entry/Exit box
  doc.rect(centerX + 25, yPos + 10, 8, 8);
  doc.setFontSize(5);
  doc.text('0-Entrada', centerX + 25, yPos + 9);
  doc.text('1-Saída', centerX + 25, yPos + 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('1', centerX + 28, yPos + 16);
  
  // NFe details
  doc.setFontSize(8);
  doc.text(`Nº ${nfeNumber}`, centerX, yPos + 27);
  doc.setFontSize(7);
  doc.text('SÉRIE: 1', centerX, yPos + 32);
  
  // Access key section (right)
  const rightX = 135;
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('Chave de acesso', rightX, yPos + 5);
  doc.setFontSize(6);
  doc.text(formatAccessKey(accessKey), rightX, yPos + 10);
  
  doc.text('Consulta de autenticidade no portal nacional da NF-e', rightX, yPos + 17);
  doc.text('www.nfe.fazenda.gov.br/portal', rightX, yPos + 21);
  
  doc.text('Protocolo de autorização de uso', rightX, yPos + 27);
  doc.text(`${protocolNumber} ${emissionDate} ${emissionTime}`, rightX, yPos + 32);
  
  yPos += 38;
  
  // ===================== NATUREZA DA OPERAÇÃO =====================
  doc.rect(10, yPos, pageWidth - 20, 10);
  doc.setFontSize(5);
  doc.text('Natureza da operação', 12, yPos + 3);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Venda de mercadorias', 12, yPos + 8);
  
  yPos += 12;
  
  // ===================== INSCRIÇÃO ESTADUAL / CNPJ =====================
  const ieWidth = (pageWidth - 20) / 3;
  doc.rect(10, yPos, ieWidth, 10);
  doc.rect(10 + ieWidth, yPos, ieWidth, 10);
  doc.rect(10 + ieWidth * 2, yPos, ieWidth, 10);
  
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.text('Inscrição Estadual', 12, yPos + 3);
  doc.text('Inscr.est. do subst.trib.', 12 + ieWidth + 2, yPos + 3);
  doc.text('CNPJ', 12 + ieWidth * 2 + 2, yPos + 3);
  
  doc.setFontSize(8);
  doc.text(quotation.companyInfo?.cnpj || '', 12 + ieWidth * 2 + 2, yPos + 8);
  
  yPos += 12;
  
  // ===================== DESTINATÁRIO/REMETENTE =====================
  doc.setFillColor(...lightGray);
  doc.rect(10, yPos, pageWidth - 20, 6, 'F');
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('Destinatário/Remetente', 12, yPos + 4);
  yPos += 6;
  
  // Row 1: Nome, CNPJ/CPF, IE, Data emissão
  const destCols = [80, 40, 30, pageWidth - 20 - 150];
  doc.rect(10, yPos, destCols[0], 12);
  doc.rect(10 + destCols[0], yPos, destCols[1], 12);
  doc.rect(10 + destCols[0] + destCols[1], yPos, destCols[2], 12);
  doc.rect(10 + destCols[0] + destCols[1] + destCols[2], yPos, destCols[3], 12);
  
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.text('Nome / Razão Social', 12, yPos + 3);
  doc.text('CNPJ/CPF', 12 + destCols[0] + 2, yPos + 3);
  doc.text('Inscrição Estadual', 12 + destCols[0] + destCols[1] + 2, yPos + 3);
  doc.text('Data emissão', 12 + destCols[0] + destCols[1] + destCols[2] + 2, yPos + 3);
  
  doc.setFontSize(8);
  doc.text(quotation.customer?.name || '', 12, yPos + 9);
  doc.text(quotation.customer?.cnpj || '', 12 + destCols[0] + 2, yPos + 9);
  doc.text(emissionDate, 12 + destCols[0] + destCols[1] + destCols[2] + 2, yPos + 9);
  
  yPos += 12;
  
  // Row 2: Endereço, Bairro, CEP, Data saída
  doc.rect(10, yPos, destCols[0], 12);
  doc.rect(10 + destCols[0], yPos, destCols[1], 12);
  doc.rect(10 + destCols[0] + destCols[1], yPos, destCols[2], 12);
  doc.rect(10 + destCols[0] + destCols[1] + destCols[2], yPos, destCols[3], 12);
  
  doc.setFontSize(5);
  doc.text('Endereço', 12, yPos + 3);
  doc.text('Bairro', 12 + destCols[0] + 2, yPos + 3);
  doc.text('CEP', 12 + destCols[0] + destCols[1] + 2, yPos + 3);
  doc.text('Data saída', 12 + destCols[0] + destCols[1] + destCols[2] + 2, yPos + 3);
  
  doc.setFontSize(7);
  doc.text(quotation.customer?.address || '', 12, yPos + 9);
  doc.text(emissionDate, 12 + destCols[0] + destCols[1] + destCols[2] + 2, yPos + 9);
  
  yPos += 12;
  
  // Row 3: Município, Fone, UF, Hora saída
  doc.rect(10, yPos, destCols[0], 12);
  doc.rect(10 + destCols[0], yPos, destCols[1], 12);
  doc.rect(10 + destCols[0] + destCols[1], yPos, destCols[2], 12);
  doc.rect(10 + destCols[0] + destCols[1] + destCols[2], yPos, destCols[3], 12);
  
  doc.setFontSize(5);
  doc.text('Município', 12, yPos + 3);
  doc.text('Fone/Fax', 12 + destCols[0] + 2, yPos + 3);
  doc.text('UF', 12 + destCols[0] + destCols[1] + 2, yPos + 3);
  doc.text('Hora saída', 12 + destCols[0] + destCols[1] + destCols[2] + 2, yPos + 3);
  
  doc.setFontSize(8);
  doc.text(quotation.customer?.phone || '', 12 + destCols[0] + 2, yPos + 9);
  doc.text(emissionTime, 12 + destCols[0] + destCols[1] + destCols[2] + 2, yPos + 9);
  
  yPos += 14;
  
  // ===================== CÁLCULO DO IMPOSTO =====================
  doc.setFillColor(...lightGray);
  doc.rect(10, yPos, pageWidth - 20, 6, 'F');
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('Cálculo do imposto', 12, yPos + 4);
  yPos += 6;
  
  // Tax calculation row 1
  const taxCols = [(pageWidth - 20) / 6, (pageWidth - 20) / 6, (pageWidth - 20) / 6, (pageWidth - 20) / 6, (pageWidth - 20) / 6, (pageWidth - 20) / 6];
  doc.rect(10, yPos, taxCols[0], 12);
  doc.rect(10 + taxCols[0], yPos, taxCols[1], 12);
  doc.rect(10 + taxCols[0] * 2, yPos, taxCols[2], 12);
  doc.rect(10 + taxCols[0] * 3, yPos, taxCols[3], 12);
  doc.rect(10 + taxCols[0] * 4, yPos, taxCols[4], 12);
  doc.rect(10 + taxCols[0] * 5, yPos, taxCols[5], 12);
  
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.text('Base de cálculo do ICMS', 12, yPos + 3);
  doc.text('Valor do ICMS', 12 + taxCols[0], yPos + 3);
  doc.text('Base de cálculo do ICMS Subst.', 12 + taxCols[0] * 2, yPos + 3);
  doc.text('Valor do ICMS Subst.', 12 + taxCols[0] * 3, yPos + 3);
  doc.text('Valor do FCP ST', 12 + taxCols[0] * 4, yPos + 3);
  doc.text('Valor total dos produtos', 12 + taxCols[0] * 5, yPos + 3);
  
  doc.setFontSize(7);
  doc.text(formatCurrency(taxCalc.baseCalculo).replace('R$', '').trim(), 12, yPos + 9);
  doc.text(formatCurrency(taxCalc.icmsValue).replace('R$', '').trim(), 12 + taxCols[0], yPos + 9);
  doc.text('0,00', 12 + taxCols[0] * 2, yPos + 9);
  doc.text('0,00', 12 + taxCols[0] * 3, yPos + 9);
  doc.text('0,00', 12 + taxCols[0] * 4, yPos + 9);
  doc.text(formatCurrency(quotation.subtotal).replace('R$', '').trim(), 12 + taxCols[0] * 5, yPos + 9);
  
  yPos += 12;
  
  // Tax calculation row 2
  doc.rect(10, yPos, taxCols[0], 12);
  doc.rect(10 + taxCols[0], yPos, taxCols[1], 12);
  doc.rect(10 + taxCols[0] * 2, yPos, taxCols[2], 12);
  doc.rect(10 + taxCols[0] * 3, yPos, taxCols[3], 12);
  doc.rect(10 + taxCols[0] * 4, yPos, taxCols[4], 12);
  doc.rect(10 + taxCols[0] * 5, yPos, taxCols[5], 12);
  
  doc.setFontSize(5);
  doc.text('Valor do frete', 12, yPos + 3);
  doc.text('Valor do seguro', 12 + taxCols[0], yPos + 3);
  doc.text('Desconto', 12 + taxCols[0] * 2, yPos + 3);
  doc.text('Outras despesas acessórias', 12 + taxCols[0] * 3, yPos + 3);
  doc.text('Valor do IPI', 12 + taxCols[0] * 4, yPos + 3);
  doc.text('Valor total da nota', 12 + taxCols[0] * 5, yPos + 3);
  
  doc.setFontSize(7);
  const freightValue = quotation.freight || 0;
  doc.text(freightValue === 0 ? '0,00' : formatCurrency(freightValue).replace('R$', '').trim(), 12, yPos + 9);
  doc.text('0,00', 12 + taxCols[0], yPos + 9);
  doc.text(formatCurrency(quotation.discount).replace('R$', '').trim(), 12 + taxCols[0] * 2, yPos + 9);
  doc.text('0,00', 12 + taxCols[0] * 3, yPos + 9);
  doc.text(formatCurrency(taxCalc.ipiValue).replace('R$', '').trim(), 12 + taxCols[0] * 4, yPos + 9);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(quotation.total).replace('R$', '').trim(), 12 + taxCols[0] * 5, yPos + 9);
  doc.setFont('helvetica', 'normal');
  
  yPos += 14;
  
  // ===================== ITENS DA NOTA FISCAL =====================
  doc.setFillColor(...lightGray);
  doc.rect(10, yPos, pageWidth - 20, 6, 'F');
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('Itens da nota fiscal', 12, yPos + 4);
  yPos += 6;
  
  // Products table with full NFe format
  const tableData = quotation.items.map((item, index) => {
    const ncm = getNcmCode(item.product.type);
    const cfop = getCfopCode(false);
    const itemTax = taxCalc.baseCalculo > 0 
      ? (item.subtotal / taxCalc.baseCalculo) * taxCalc.icmsValue 
      : 0;
    
    return [
      (index + 1).toString().padStart(3, '0'),
      getProductFullDescription(item.product.type, item.product.capacity, item.product.unit),
      ncm,
      CST_CODES.normal,
      cfop,
      'UN',
      item.quantity.toString(),
      formatCurrency(item.unitPrice).replace('R$', '').trim(),
      formatCurrency(item.subtotal).replace('R$', '').trim(),
      formatCurrency(quotation.discount / quotation.items.length).replace('R$', '').trim(),
      formatCurrency(item.subtotal).replace('R$', '').trim(),
      formatCurrency(itemTax).replace('R$', '').trim(),
      '0,00',
      `${(DEFAULT_TAX_RATES.icms * 100).toFixed(1)}`,
      '0,00',
    ];
  });
  
  autoTable(doc, {
    startY: yPos,
    head: [['Cód', 'Descrição do produto/serviço', 'NCM/SH', 'CST', 'CFOP', 'UN', 'Qtde', 'Preço un', 'Preço total', 'Desconto', 'BC ICMS', 'Vlr.ICMS', 'Vlr.IPI', '%ICMS', '%IPI']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 5,
      halign: 'center',
      cellPadding: 1,
    },
    bodyStyles: {
      fontSize: 5,
      textColor: [30, 30, 30],
      cellPadding: 1.5,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 42, halign: 'left' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 8, halign: 'center' },
      4: { cellWidth: 10, halign: 'center' },
      5: { cellWidth: 8, halign: 'center' },
      6: { cellWidth: 8, halign: 'center' },
      7: { cellWidth: 14, halign: 'right' },
      8: { cellWidth: 14, halign: 'right' },
      9: { cellWidth: 12, halign: 'right' },
      10: { cellWidth: 14, halign: 'right' },
      11: { cellWidth: 12, halign: 'right' },
      12: { cellWidth: 10, halign: 'right' },
      13: { cellWidth: 8, halign: 'center' },
      14: { cellWidth: 8, halign: 'center' },
    },
    margin: { left: 10, right: 10 },
  });
  
  let finalY = (doc as any).lastAutoTable.finalY + 4;
  
  // ===================== DADOS ADICIONAIS =====================
  doc.setFillColor(...lightGray);
  doc.rect(10, finalY, pageWidth - 20, 6, 'F');
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('Dados adicionais', 12, finalY + 4);
  finalY += 6;
  
  doc.rect(10, finalY, (pageWidth - 20) / 2, 25);
  doc.rect(10 + (pageWidth - 20) / 2, finalY, (pageWidth - 20) / 2, 25);
  
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.text('Observações', 12, finalY + 3);
  doc.text('Reservado ao fisco', 12 + (pageWidth - 20) / 2 + 2, finalY + 3);
  
  // Tax summary text
  const taxSummary = `Total aproximado de tributos: ${formatCurrency(taxCalc.totalTaxes)} (${taxCalc.taxPercentage.toFixed(2)}%) ` +
    `Federais ${formatCurrency(taxCalc.pisValue + taxCalc.cofinsValue)} (${((DEFAULT_TAX_RATES.pis + DEFAULT_TAX_RATES.cofins) * 100).toFixed(2)}%) ` +
    `Estaduais ${formatCurrency(taxCalc.icmsValue)} (${(DEFAULT_TAX_RATES.icms * 100).toFixed(2)}%). Fonte IBPT.`;
  
  doc.setFontSize(5);
  const splitTaxText = doc.splitTextToSize(taxSummary, (pageWidth - 20) / 2 - 4);
  doc.text(splitTaxText, 12, finalY + 8);
  
  // Additional info
  const additionalInfo = [
    `Orçamento de referência: ${quotation.number}`,
    `Condições: ${quotation.paymentConditions?.cashDiscount || ''} | ${quotation.paymentConditions?.installments || ''}`,
    `Prazo de entrega: ${quotation.deliveryTime}`,
    quotation.observations || '',
  ].filter(Boolean);
  
  doc.text(additionalInfo.join('\n'), 12, finalY + 14);
  
  finalY += 28;
  
  // ===================== FOOTER =====================
  doc.setFillColor(0, 82, 147);
  doc.rect(0, pageHeight - 8, pageWidth, 8, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6);
  doc.text('DOCUMENTO SEM VALOR FISCAL - APENAS PARA FINS DE CONTROLE INTERNO E ORÇAMENTÁRIO', pageWidth / 2, pageHeight - 3, { align: 'center' });
  
  return doc;
};

export const downloadNFePDF = (quotation: Quotation, nfeNumber: string) => {
  const doc = generateNFePDF(quotation, nfeNumber);
  doc.save(`NFe_${nfeNumber}_${quotation.customer?.name?.replace(/\s/g, '_') || 'Cliente'}.pdf`);
};
