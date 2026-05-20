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
    const widths = [1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1];
    for (let j = 0; j < widths.length; j++) {
      if (j % 2 === 0) {
        doc.rect(currentX, y, barWidth * widths[j], height, 'F');
      }
      currentX += barWidth * widths[j];
    }
  }
};

export const generateNFePDF = async (quotation: Quotation, nfeNumber: string): Promise<jsPDF> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const contentWidth = pageWidth - (margin * 2);
  
  // Professional black and white palette for DANFE
  const primaryBlack = [0, 0, 0] as const;
  const darkGray = [50, 50, 50] as const;
  const mediumGray = [100, 100, 100] as const;
  const lightGray = [240, 240, 240] as const;
  const white = [255, 255, 255] as const;
  
  const accessKey = generateAccessKey();
  const protocolNumber = Math.floor(Math.random() * 999999999999).toString().padStart(15, '0');
  const emissionDate = formatDate(new Date());
  const emissionTime = new Date().toLocaleTimeString('pt-BR');
  const taxCalc = calculateTotalTaxes(quotation.items, DEFAULT_TAX_RATES);
  
  let y = margin;
  
  // HEADER SECTION - Professional DANFE Header
  doc.setFillColor(...white);
  doc.setDrawColor(...primaryBlack);
  doc.rect(margin, y, contentWidth, 28, 'S');
  
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
  doc.setTextColor(...primaryBlack);
  doc.text('DANFE', pageWidth / 2, y + 12, { align: 'center' });
  
  doc.setFontSize(6);
  doc.text('Documento Auxiliar da Nota Fiscal Eletrônica', pageWidth / 2, y + 18, { align: 'center' });
  
  // NFe Number (Right)
  doc.setFontSize(10);
  doc.text(`Nº ${nfeNumber}`, pageWidth - margin - 8, y + 12, { align: 'right' });
  
  doc.setFontSize(7);
  doc.text('Série 1 | 1-Saída', pageWidth - margin - 8, y + 18, { align: 'right' });
  
  y += 30;
  
  // ACCESS KEY & BARCODE SECTION
  doc.setFillColor(...white);
  doc.setDrawColor(...primaryBlack);
  doc.rect(margin, y, contentWidth, 22, 'S');
  
  drawBarcode(doc, accessKey.slice(0, 24), margin + 5, y + 3, 80, 10);
  
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text('CHAVE DE ACESSO', margin + 5, y + 16);
  
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(formatAccessKey(accessKey), margin + 5, y + 20);
  
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('PROTOCOLO DE AUTORIZAÇÃO', pageWidth - margin - 60, y + 6);
  
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text(protocolNumber, pageWidth - margin - 60, y + 11);
  doc.text(`${emissionDate} às ${emissionTime}`, pageWidth - margin - 60, y + 16);
  
  y += 24;
  
  // EMITENTE SECTION
  doc.setFillColor(...lightGray);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryBlack);
  doc.text('EMITENTE', margin + 4, y + 4.5);
  y += 6;
  
  doc.setFillColor(...white);
  doc.setDrawColor(...primaryBlack);
  doc.rect(margin, y, contentWidth, 22, 'S');
  
  doc.setTextColor(...primaryBlack);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(quotation.companyInfo?.name || 'EMPRESA EMITENTE', margin + 4, y + 6);
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkGray);
  
  let emitY = y + 11;
  if (quotation.companyInfo?.cnpj) {
    doc.text(`${getBrazilDocumentLabel(quotation.companyInfo.cnpj)}: ${quotation.companyInfo.cnpj}`, margin + 4, emitY);
    emitY += 4;
  }
  if (quotation.companyInfo?.address) {
    doc.text(quotation.companyInfo.address, margin + 4, emitY);
    emitY += 4;
  }
  
  y += 24;
  
  // DESTINATÁRIO SECTION
  doc.setFillColor(...lightGray);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryBlack);
  doc.text('DESTINATÁRIO / REMETENTE', margin + 4, y + 4.5);
  y += 6;
  
  doc.setFillColor(...white);
  doc.setDrawColor(...primaryBlack);
  doc.rect(margin, y, contentWidth, 22, 'S');
  
  doc.setTextColor(...primaryBlack);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(quotation.customer?.name || 'CLIENTE', margin + 4, y + 6);
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkGray);
  
  let destY = y + 11;
  if (quotation.customer?.cnpj) {
    doc.text(`${getBrazilDocumentLabel(quotation.customer.cnpj)}: ${quotation.customer.cnpj}`, margin + 4, destY);
    destY += 4;
  }
  if (quotation.customer?.address) {
    doc.text(quotation.customer.address, margin + 4, destY);
    destY += 4;
  }
  
  y += 24;
  
  // NATUREZA DA OPERAÇÃO
  doc.setFillColor(...white);
  doc.setDrawColor(...primaryBlack);
  doc.rect(margin, y, contentWidth, 10, 'S');
  
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...mediumGray);
  doc.text('NATUREZA DA OPERAÇÃO', margin + 4, y + 3.5);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryBlack);
  doc.text('VENDA DE MERCADORIA', margin + 4, y + 8);
  
  y += 12;
  
  // CÁLCULO DO IMPOSTO
  doc.setFillColor(...lightGray);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryBlack);
  doc.text('CÁLCULO DO IMPOSTO', margin + 4, y + 4.5);
  y += 6;
  
  const taxColWidth = contentWidth / 6;
  doc.setFillColor(...white);
  doc.setDrawColor(...primaryBlack);
  
  for (let i = 0; i < 6; i++) {
    doc.rect(margin + (taxColWidth * i), y, taxColWidth, 12, 'S');
  }
  
  const taxLabels1 = ['BC DO ICMS', 'VL. ICMS', 'BC ICMS ST', 'VL. ICMS ST', 'VL. IMP. IMPORT.', 'VL. PRODUTOS'];
  const taxValues1 = [
    formatCurrency(taxCalc.baseCalculo).replace('R$', ''),
    formatCurrency(taxCalc.icmsValue).replace('R$', ''),
    '0,00', '0,00', '0,00',
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
  doc.setTextColor(...primaryBlack);
  for (let i = 0; i < 6; i++) {
    doc.text(taxValues1[i].trim(), margin + (taxColWidth * i) + 2, y + 10);
  }
  
  y += 12;
  
  for (let i = 0; i < 6; i++) {
    doc.rect(margin + (taxColWidth * i), y, taxColWidth, 12, 'S');
  }
  
  const taxLabels2 = ['VL. FRETE', 'VL. SEGURO', 'DESCONTO', 'OUTRAS DESP.', 'VL. IPI', 'VL. TOTAL NOTA'];
  const freightValue = quotation.freight || 0;
  const taxValues2 = [
    freightValue === 0 ? '0,00' : formatCurrency(freightValue).replace('R$', ''),
    '0,00',
    formatCurrency(quotation.discount).replace('R$', ''),
    '0,00', '0,00',
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
  doc.setTextColor(...primaryBlack);
  for (let i = 0; i < 6; i++) {
    doc.text(taxValues2[i].trim(), margin + (taxColWidth * i) + 2, y + 10);
  }
  
  y += 14;
  
  // PRODUTOS / SERVIÇOS
  doc.setFillColor(...lightGray);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryBlack);
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
      ncm, CST_CODES.normal, cfop, 'UN', item.quantity.toString(),
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
    theme: 'grid',
    styles: {
      fontSize: 6,
      cellPadding: 2,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 5.5,
      halign: 'center',
    },
    margin: { left: margin, right: margin },
  });
  
  return doc;
};

export const downloadNFePDF = async (quotation: Quotation, nfeNumber: string) => {
  const doc = await generateNFePDF(quotation, nfeNumber);
  doc.save(`DANFE_${nfeNumber}.pdf`);
};
