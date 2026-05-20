import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Quotation } from '@/types/quotation';
import { formatCurrency, formatDate, getBrazilDocumentLabel } from './formatters';
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
  
  const parts = [
    '35', year + month,
    '00000000000000'.slice(0, 14),
    '55', '001',
    Math.random().toString().slice(2, 11).padStart(9, '0'),
    '1',
    Math.random().toString().slice(2, 10).padStart(8, '0'),
  ];
  
  const keyWithoutDV = parts.join('');
  const dv = calculateDV(keyWithoutDV);
  return keyWithoutDV + dv;
};

const calculateDV = (key: string): string => {
  const weights = [2, 3, 4, 5, 6, 7, 8, 9];
  let sum = 0;
  let weightIndex = 0;
  for (let i = key.length - 1; i >= 0; i--) {
    sum += parseInt(key[i]) * weights[weightIndex % 8];
    weightIndex++;
  }
  const rest = sum % 11;
  return (rest < 2 ? 0 : 11 - rest).toString();
};

const formatAccessKey = (key: string): string => {
  return key.match(/.{1,4}/g)?.join(' ') || key;
};

// Draw professional barcode
const drawBarcode = (doc: jsPDF, data: string, x: number, y: number, width: number, height: number) => {
  const pattern = data.split('').map(c => parseInt(c) || 0);
  const barWidth = width / (pattern.length * 11);
  
  doc.setFillColor(0, 0, 0);
  let currentX = x;
  
  for (let i = 0; i < pattern.length; i++) {
    // Create varying bar widths based on digit
    const digit = pattern[i];
    const widths = [1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1];
    
    for (let j = 0; j < widths.length; j++) {
      if (j % 2 === 0) {
        doc.rect(currentX, y, barWidth * widths[j], height, 'F');
      }
      currentX += barWidth * widths[j];
    }
  }
};

// Draw rounded rectangle helper
const drawRoundedRect = (doc: jsPDF, x: number, y: number, w: number, h: number, r: number, style: 'S' | 'F' | 'FD' = 'S') => {
  doc.roundedRect(x, y, w, h, r, r, style);
};

export const generateNFePDF = async (quotation: Quotation, nfeNumber: string): Promise<jsPDF> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - (margin * 2);
  
  // Professional black and white palette for DANFE
  const primaryBlack = [0, 0, 0] as const;
  const darkGray = [50, 50, 50] as const;
  const mediumGray = [100, 100, 100] as const;
  const lightGray = [240, 240, 240] as const;
  const borderGray = [0, 0, 0] as const;
  const white = [255, 255, 255] as const;
  
  const accessKey = generateAccessKey();
  const protocolNumber = Math.floor(Math.random() * 999999999999).toString().padStart(15, '0');
  const emissionDate = formatDate(new Date());
  const emissionTime = new Date().toLocaleTimeString('pt-BR');
  const taxCalc = calculateTotalTaxes(quotation.items, DEFAULT_TAX_RATES);
  
  let y = margin;
  
  // ══════════════════════════════════════════════════════════════
  // HEADER SECTION - Professional DANFE Header
  // ══════════════════════════════════════════════════════════════
  
  // Header background (White for DANFE)
  doc.setFillColor(...white);
  doc.setDrawColor(...primaryBlack);
  doc.rect(margin, y, contentWidth, 28, 'S');
  
  // No gradient stripe for DANFE

  
  // Company Logo Area (Left)
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryBlack);
  doc.text('FORTLEV', margin + 8, y + 14);
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Caixas d\'Água e Tanques', margin + 8, y + 20);
  
  // DANFE Title (Center)
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('DANFE', pageWidth / 2, y + 12, { align: 'center' });
  
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('Documento Auxiliar da Nota Fiscal Eletrônica', pageWidth / 2, y + 18, { align: 'center' });
  
  // NFe Number (Right)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Nº ${nfeNumber}`, pageWidth - margin - 8, y + 12, { align: 'right' });
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Série 1 | 1-Saída', pageWidth - margin - 8, y + 18, { align: 'right' });
  
  y += 30;
  
  // ══════════════════════════════════════════════════════════════
  // ACCESS KEY & BARCODE SECTION
  // ══════════════════════════════════════════════════════════════
  
  doc.setFillColor(...lightBlue);
  doc.rect(margin, y, contentWidth, 22, 'F');
  doc.setDrawColor(...borderGray);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, contentWidth, 22, 'S');
  
  // Barcode
  drawBarcode(doc, accessKey.slice(0, 24), margin + 5, y + 3, 80, 10);
  
  // Access Key
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text('CHAVE DE ACESSO', margin + 5, y + 16);
  
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(formatAccessKey(accessKey), margin + 5, y + 20);
  
  // Protocol
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('PROTOCOLO DE AUTORIZAÇÃO', pageWidth - margin - 60, y + 6);
  
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text(protocolNumber, pageWidth - margin - 60, y + 11);
  doc.text(`${emissionDate} às ${emissionTime}`, pageWidth - margin - 60, y + 16);
  
  y += 24;
  
  // ══════════════════════════════════════════════════════════════
  // EMITENTE SECTION
  // ══════════════════════════════════════════════════════════════
  
  // Section header
  doc.setFillColor(...primaryBlue);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...white);
  doc.text('EMITENTE', margin + 4, y + 4.5);
  y += 6;
  
  // Emitente content box
  doc.setFillColor(...white);
  doc.setDrawColor(...borderGray);
  doc.rect(margin, y, contentWidth, 22, 'FD');
  
  doc.setTextColor(...darkGray);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(quotation.companyInfo?.name || 'EMPRESA EMITENTE', margin + 4, y + 6);
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mediumGray);
  
  let emitY = y + 11;
  if (quotation.companyInfo?.cnpj) {
    doc.text(`${getBrazilDocumentLabel(quotation.companyInfo.cnpj)}: ${quotation.companyInfo.cnpj}`, margin + 4, emitY);
    emitY += 4;
  }
  if (quotation.companyInfo?.address) {
    doc.text(quotation.companyInfo.address, margin + 4, emitY);
    emitY += 4;
  }
  
  // Contact info on right side
  if (quotation.companyInfo?.phone) {
    doc.text(`Tel: ${quotation.companyInfo.phone}`, pageWidth - margin - 60, y + 6);
  }
  if (quotation.companyInfo?.email) {
    doc.text(quotation.companyInfo.email, pageWidth - margin - 60, y + 10);
  }
  if (quotation.companyInfo?.website) {
    doc.text(quotation.companyInfo.website, pageWidth - margin - 60, y + 14);
  }
  
  y += 24;
  
  // ══════════════════════════════════════════════════════════════
  // DESTINATÁRIO SECTION
  // ══════════════════════════════════════════════════════════════
  
  doc.setFillColor(...primaryBlue);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...white);
  doc.text('DESTINATÁRIO / REMETENTE', margin + 4, y + 4.5);
  y += 6;
  
  doc.setFillColor(...white);
  doc.setDrawColor(...borderGray);
  doc.rect(margin, y, contentWidth, 22, 'FD');
  
  doc.setTextColor(...darkGray);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(quotation.customer?.name || 'CLIENTE', margin + 4, y + 6);
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mediumGray);
  
  let destY = y + 11;
  if (quotation.customer?.cnpj) {
    doc.text(`${getBrazilDocumentLabel(quotation.customer.cnpj)}: ${quotation.customer.cnpj}`, margin + 4, destY);
    destY += 4;
  }
  if (quotation.customer?.address) {
    doc.text(quotation.customer.address, margin + 4, destY);
    destY += 4;
  }
  if (quotation.customer?.phone) {
    doc.text(`Tel: ${quotation.customer.phone}`, margin + 4, destY);
  }
  
  // Date info on right
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text('Data de Emissão:', pageWidth - margin - 50, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(emissionDate, pageWidth - margin - 50, y + 10);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Hora de Saída:', pageWidth - margin - 50, y + 16);
  doc.setFont('helvetica', 'normal');
  doc.text(emissionTime, pageWidth - margin - 50, y + 20);
  
  y += 24;
  
  // ══════════════════════════════════════════════════════════════
  // NATUREZA DA OPERAÇÃO
  // ══════════════════════════════════════════════════════════════
  
  doc.setFillColor(...lightGray);
  doc.setDrawColor(...borderGray);
  doc.rect(margin, y, contentWidth, 10, 'FD');
  
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...mediumGray);
  doc.text('NATUREZA DA OPERAÇÃO', margin + 4, y + 3.5);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text('VENDA DE MERCADORIA', margin + 4, y + 8);
  
  y += 12;
  
  // ══════════════════════════════════════════════════════════════
  // CÁLCULO DO IMPOSTO - Clean 2-row layout
  // ══════════════════════════════════════════════════════════════
  
  doc.setFillColor(...primaryBlue);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...white);
  doc.text('CÁLCULO DO IMPOSTO', margin + 4, y + 4.5);
  y += 6;
  
  // Tax row 1
  const taxColWidth = contentWidth / 6;
  doc.setFillColor(...white);
  doc.setDrawColor(...borderGray);
  
  for (let i = 0; i < 6; i++) {
    doc.rect(margin + (taxColWidth * i), y, taxColWidth, 12, 'FD');
  }
  
  const taxLabels1 = ['BC DO ICMS', 'VL. ICMS', 'BC ICMS ST', 'VL. ICMS ST', 'VL. IMP. IMPORT.', 'VL. PRODUTOS'];
  const taxValues1 = [
    formatCurrency(taxCalc.baseCalculo).replace('R$', ''),
    formatCurrency(taxCalc.icmsValue).replace('R$', ''),
    '0,00',
    '0,00',
    '0,00',
    formatCurrency(quotation.subtotal).replace('R$', ''),
  ];
  
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...mediumGray);
  for (let i = 0; i < 6; i++) {
    doc.text(taxLabels1[i], margin + (taxColWidth * i) + 2, y + 4);
  }
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkGray);
  for (let i = 0; i < 6; i++) {
    doc.text(taxValues1[i].trim(), margin + (taxColWidth * i) + 2, y + 10);
  }
  
  y += 12;
  
  // Tax row 2
  for (let i = 0; i < 6; i++) {
    doc.rect(margin + (taxColWidth * i), y, taxColWidth, 12, 'FD');
  }
  
  const taxLabels2 = ['VL. FRETE', 'VL. SEGURO', 'DESCONTO', 'OUTRAS DESP.', 'VL. IPI', 'VL. TOTAL NOTA'];
  const freightValue = quotation.freight || 0;
  const taxValues2 = [
    freightValue === 0 ? '0,00' : formatCurrency(freightValue).replace('R$', ''),
    '0,00',
    formatCurrency(quotation.discount).replace('R$', ''),
    '0,00',
    '0,00',
    formatCurrency(quotation.total).replace('R$', ''),
  ];
  
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...mediumGray);
  for (let i = 0; i < 6; i++) {
    doc.text(taxLabels2[i], margin + (taxColWidth * i) + 2, y + 4);
  }
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkGray);
  for (let i = 0; i < 5; i++) {
    doc.text(taxValues2[i].trim(), margin + (taxColWidth * i) + 2, y + 10);
  }
  
  // Total highlight
  doc.setFillColor(...primaryBlue);
  doc.rect(margin + (taxColWidth * 5), y, taxColWidth, 12, 'F');
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...white);
  doc.text(taxLabels2[5], margin + (taxColWidth * 5) + 2, y + 4);
  doc.setFontSize(9);
  doc.text(taxValues2[5].trim(), margin + (taxColWidth * 5) + 2, y + 10);
  
  y += 14;
  
  // ══════════════════════════════════════════════════════════════
  // PRODUTOS / SERVIÇOS - Clean professional table
  // ══════════════════════════════════════════════════════════════
  
  doc.setFillColor(...primaryBlue);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...white);
  doc.text('DADOS DOS PRODUTOS / SERVIÇOS', margin + 4, y + 4.5);
  y += 6;
  
  const tableData = quotation.items.map((item, index) => {
    const ncm = getNcmCode(item.product.type);
    const cfop = getCfopCode(false);
    const itemTax = taxCalc.baseCalculo > 0 
      ? (item.subtotal / taxCalc.baseCalculo) * taxCalc.icmsValue 
      : 0;
    
    return [
      (index + 1).toString().padStart(3, '0'),
      item.product.capacity > 0
        ? getProductFullDescription(item.product.type, item.product.capacity, item.product.unit)
        : item.product.name,
      ncm,
      CST_CODES.normal,
      cfop,
      'UN',
      item.quantity.toString(),
      formatCurrency(item.unitPrice).replace('R$', '').trim(),
      formatCurrency(item.subtotal).replace('R$', '').trim(),
      formatCurrency(item.subtotal).replace('R$', '').trim(),
      formatCurrency(itemTax).replace('R$', '').trim(),
      `${(DEFAULT_TAX_RATES.icms * 100).toFixed(0)}%`,
    ];
  });
  
  autoTable(doc, {
    startY: y,
    head: [['CÓD', 'DESCRIÇÃO', 'NCM', 'CST', 'CFOP', 'UN', 'QTD', 'VL.UNIT', 'VL.TOT', 'BC ICMS', 'ICMS', '%']],
    body: tableData,
    theme: 'plain',
    styles: {
      fontSize: 6,
      cellPadding: 2,
      lineColor: [...borderGray],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [...lightGray],
      textColor: [...darkGray],
      fontStyle: 'bold',
      fontSize: 5.5,
      halign: 'center',
      cellPadding: 2.5,
    },
    bodyStyles: {
      textColor: [...darkGray],
      fontSize: 6,
    },
    alternateRowStyles: {
      fillColor: [252, 253, 255],
    },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center' },
      1: { cellWidth: 46, halign: 'left' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 9, halign: 'center' },
      4: { cellWidth: 11, halign: 'center' },
      5: { cellWidth: 9, halign: 'center' },
      6: { cellWidth: 10, halign: 'center' },
      7: { cellWidth: 17, halign: 'right' },
      8: { cellWidth: 17, halign: 'right' },
      9: { cellWidth: 17, halign: 'right' },
      10: { cellWidth: 15, halign: 'right' },
      11: { cellWidth: 9, halign: 'center' },
    },
    margin: { left: margin, right: margin },
    tableLineColor: [...borderGray],
    tableLineWidth: 0.2,
  });
  
  let finalY = (doc as any).lastAutoTable.finalY + 3;
  
  // ══════════════════════════════════════════════════════════════
  // TOTAIS EM DESTAQUE - Premium highlight section
  // ══════════════════════════════════════════════════════════════
  
  const totalsWidth = 70;
  const totalsX = pageWidth - margin - totalsWidth;
  
  // Background box for totals
  doc.setFillColor(...lightBlue);
  doc.setDrawColor(...primaryBlue);
  doc.setLineWidth(0.5);
  doc.rect(totalsX, finalY, totalsWidth, 28, 'FD');
  
  // Subtotal
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mediumGray);
  doc.text('Subtotal Produtos:', totalsX + 4, finalY + 6);
  doc.setTextColor(...darkGray);
  doc.text(formatCurrency(quotation.subtotal), totalsX + totalsWidth - 4, finalY + 6, { align: 'right' });
  
  // Frete
  doc.setTextColor(...mediumGray);
  doc.text('Frete:', totalsX + 4, finalY + 12);
  doc.setTextColor(...darkGray);
  doc.text(freightValue === 0 ? 'Grátis' : formatCurrency(freightValue), totalsX + totalsWidth - 4, finalY + 12, { align: 'right' });
  
  // Desconto
  doc.setTextColor(...mediumGray);
  doc.text('Desconto:', totalsX + 4, finalY + 18);
  doc.setTextColor(...darkGray);
  doc.text(formatCurrency(quotation.discount), totalsX + totalsWidth - 4, finalY + 18, { align: 'right' });
  
  // Total final highlight
  doc.setFillColor(...primaryBlue);
  doc.rect(totalsX, finalY + 21, totalsWidth, 7, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...white);
  doc.text('TOTAL:', totalsX + 4, finalY + 26);
  doc.setFontSize(10);
  doc.text(formatCurrency(quotation.total), totalsX + totalsWidth - 4, finalY + 26, { align: 'right' });
  
  // ══════════════════════════════════════════════════════════════
  // INFORMAÇÕES ADICIONAIS - Left side
  // ══════════════════════════════════════════════════════════════
  
  doc.setFillColor(...primaryBlue);
  doc.rect(margin, finalY, 110, 6, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...white);
  doc.text('INFORMAÇÕES ADICIONAIS', margin + 4, finalY + 4.5);
  
  doc.setFillColor(...white);
  doc.setDrawColor(...borderGray);
  doc.setLineWidth(0.3);
  doc.rect(margin, finalY + 6, 110, 22, 'FD');
  
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkGray);
  
  const taxSummary = `Tributos Aprox.: ${formatCurrency(taxCalc.totalTaxes)} (${taxCalc.taxPercentage.toFixed(2)}%) | ` +
    `Federal: ${formatCurrency(taxCalc.pisValue + taxCalc.cofinsValue)} | Estadual: ${formatCurrency(taxCalc.icmsValue)} - Fonte: IBPT`;
  
  doc.text(taxSummary, margin + 3, finalY + 11);
  doc.text(`Orçamento Ref.: ${quotation.number}`, margin + 3, finalY + 16);
  doc.text(`Condições: ${quotation.paymentConditions?.cashDiscount || ''} | ${quotation.paymentConditions?.installments || ''}`, margin + 3, finalY + 21);
  doc.text(`Prazo de Entrega: ${quotation.deliveryTime}`, margin + 3, finalY + 26);
  
  finalY += 32;
  
  // ══════════════════════════════════════════════════════════════
  // CANHOTO DE RECEBIMENTO - Bottom
  // ══════════════════════════════════════════════════════════════
  
  // Dashed separator
  doc.setLineDashPattern([2, 2], 0);
  doc.setDrawColor(...mediumGray);
  doc.line(margin, finalY, pageWidth - margin, finalY);
  doc.setLineDashPattern([], 0);
  
  finalY += 3;
  
  doc.setFillColor(...lightGray);
  doc.setDrawColor(...borderGray);
  doc.rect(margin, finalY, contentWidth - 30, 16, 'FD');
  
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkGray);
  doc.text(`Recebemos de ${quotation.companyInfo?.name || 'EMPRESA'} os produtos/serviços constantes nesta Nota Fiscal.`, margin + 3, finalY + 5);
  
  doc.setFontSize(5);
  doc.setTextColor(...mediumGray);
  doc.text('DATA DE RECEBIMENTO', margin + 3, finalY + 11);
  doc.text('IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR', margin + 50, finalY + 11);
  
  // NFe box
  doc.setFillColor(...primaryBlue);
  doc.rect(pageWidth - margin - 28, finalY, 28, 16, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...white);
  doc.text('NF-e', pageWidth - margin - 14, finalY + 6, { align: 'center' });
  doc.setFontSize(9);
  doc.text(`Nº ${nfeNumber}`, pageWidth - margin - 14, finalY + 12, { align: 'center' });
  
  return doc;
};

export const downloadNFePDF = async (quotation: Quotation, nfeNumber: string) => {
  const doc = await generateNFePDF(quotation, nfeNumber);
  doc.save(`NFe_${nfeNumber}_${quotation.customer?.name?.replace(/\s/g, '_') || 'Cliente'}.pdf`);
};
