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

// Generate Code 128 barcode pattern
const generateBarcode128Pattern = (data: string): string => {
  // Simplified barcode pattern for visual representation
  const patterns: { [key: string]: string } = {
    '0': '11011001100', '1': '11001101100', '2': '11001100110', '3': '10010011000',
    '4': '10010001100', '5': '10001001100', '6': '10011001000', '7': '10011000100',
    '8': '10001100100', '9': '11001001000',
  };
  
  let barcode = '11010010000'; // Start Code B
  for (const char of data) {
    if (patterns[char]) {
      barcode += patterns[char];
    } else {
      barcode += '11011011011'; // Default pattern
    }
  }
  barcode += '1100011101011'; // Stop pattern
  
  return barcode;
};

// Draw barcode on PDF
const drawBarcode = (doc: jsPDF, data: string, x: number, y: number, width: number, height: number) => {
  const pattern = generateBarcode128Pattern(data);
  const barWidth = width / pattern.length;
  
  doc.setFillColor(0, 0, 0);
  
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '1') {
      doc.rect(x + (i * barWidth), y, barWidth, height, 'F');
    }
  }
};

export const generateNFePDF = async (quotation: Quotation, nfeNumber: string): Promise<jsPDF> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Colors
  const black = [0, 0, 0] as const;
  const lightGray = [245, 245, 245] as const;
  const primaryBlue = [0, 56, 109] as const; // Fortlev blue #00386D
  
  const accessKey = generateAccessKey();
  const protocolNumber = Math.floor(Math.random() * 999999999999).toString().padStart(15, '0');
  const emissionDate = formatDate(new Date());
  const emissionTime = new Date().toLocaleTimeString('pt-BR');
  
  // Calculate taxes
  const taxCalc = calculateTotalTaxes(quotation.items, DEFAULT_TAX_RATES);
  
  let yPos = 5;
  
  // ===================== RECEIPT SECTION (top) =====================
  doc.setDrawColor(...black);
  doc.setLineWidth(0.4);
  
  // Outer receipt box
  doc.rect(10, yPos, pageWidth - 48, 20);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`RECEBEMOS DE ${quotation.companyInfo?.name || 'EMPRESA'} OS PRODUTOS/SERVIÇOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO`, 12, yPos + 5);
  
  doc.setFontSize(5);
  doc.text('DATA DE RECEBIMENTO', 12, yPos + 12);
  doc.text('IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR', 55, yPos + 12);
  
  // Separator line in receipt
  doc.line(50, yPos + 8, 50, yPos + 20);
  
  // NFe number box (right side)
  doc.rect(pageWidth - 36, yPos, 26, 20);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('NF-e', pageWidth - 23, yPos + 6, { align: 'center' });
  doc.setFontSize(7);
  doc.text(`Nº ${nfeNumber}`, pageWidth - 23, yPos + 12, { align: 'center' });
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('SÉRIE 1', pageWidth - 23, yPos + 17, { align: 'center' });
  
  yPos += 23;
  
  // Dashed line separator
  doc.setLineDashPattern([1, 1], 0);
  doc.line(10, yPos, pageWidth - 10, yPos);
  doc.setLineDashPattern([], 0);
  
  yPos += 3;
  
  // ===================== HEADER SECTION =====================
  doc.setLineWidth(0.4);
  doc.rect(10, yPos, pageWidth - 20, 38);
  
  // Left column - Logo and Company Info
  const logoWidth = 50;
  
  // Draw FORTLEV text logo
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryBlue);
  doc.text('FORTLEV', 15, yPos + 10);
  
  doc.setFontSize(6);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  
  let companyY = yPos + 15;
  if (quotation.companyInfo?.name) {
    doc.text(quotation.companyInfo.name, 15, companyY);
    companyY += 4;
  }
  if (quotation.companyInfo?.address) {
    const addressLines = doc.splitTextToSize(quotation.companyInfo.address, 55);
    doc.text(addressLines, 15, companyY);
    companyY += addressLines.length * 3.5;
  }
  if (quotation.companyInfo?.phone) {
    doc.text(`Tel: ${quotation.companyInfo.phone}`, 15, companyY);
    companyY += 4;
  }
  if (quotation.companyInfo?.email) {
    doc.text(quotation.companyInfo.email, 15, companyY);
  }
  
  // Vertical separator
  doc.line(72, yPos + 2, 72, yPos + 36);
  
  // Center column - DANFE
  const danfeX = 76;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('DANFE', danfeX, yPos + 10);
  
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('Documento Auxiliar da', danfeX, yPos + 15);
  doc.text('Nota Fiscal Eletrônica', danfeX, yPos + 19);
  
  // Entry/Exit indicator
  doc.setFontSize(5);
  doc.text('0 - ENTRADA', danfeX, yPos + 25);
  doc.text('1 - SAÍDA', danfeX, yPos + 29);
  
  doc.rect(danfeX + 22, yPos + 22, 8, 8);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1', danfeX + 25, yPos + 28);
  
  doc.setFontSize(8);
  doc.text(`Nº ${nfeNumber}`, danfeX, yPos + 35);
  doc.setFontSize(6);
  doc.text('SÉRIE: 1', danfeX + 30, yPos + 35);
  
  // Vertical separator
  doc.line(115, yPos + 2, 115, yPos + 36);
  
  // Right column - Access key and barcode
  const keyX = 118;
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('CHAVE DE ACESSO', keyX, yPos + 5);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.text(formatAccessKey(accessKey), keyX, yPos + 10);
  
  // Draw barcode
  drawBarcode(doc, accessKey.slice(0, 20), keyX, yPos + 13, 75, 8);
  
  doc.setFontSize(5);
  doc.text('Consulta de autenticidade no portal nacional da NF-e', keyX, yPos + 25);
  doc.text('www.nfe.fazenda.gov.br/portal', keyX, yPos + 29);
  
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.text('PROTOCOLO DE AUTORIZAÇÃO DE USO', keyX, yPos + 33);
  doc.setFont('helvetica', 'normal');
  doc.text(`${protocolNumber} - ${emissionDate} ${emissionTime}`, keyX, yPos + 37);
  
  yPos += 40;
  
  // ===================== NATUREZA DA OPERAÇÃO =====================
  doc.rect(10, yPos, pageWidth - 20, 8);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.text('NATUREZA DA OPERAÇÃO', 12, yPos + 3);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('VENDA DE MERCADORIA', 12, yPos + 7);
  
  yPos += 8;
  
  // ===================== INSCRIÇÃO ESTADUAL / CNPJ =====================
  const ieWidth = (pageWidth - 20) / 3;
  doc.rect(10, yPos, ieWidth, 8);
  doc.rect(10 + ieWidth, yPos, ieWidth, 8);
  doc.rect(10 + ieWidth * 2, yPos, ieWidth, 8);
  
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.text('INSCRIÇÃO ESTADUAL', 12, yPos + 3);
  doc.text('INSCRIÇÃO ESTADUAL DO SUBST. TRIB.', 12 + ieWidth + 2, yPos + 3);
  doc.text('CNPJ', 12 + ieWidth * 2 + 2, yPos + 3);
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(quotation.companyInfo?.cnpj || '', 12 + ieWidth * 2 + 2, yPos + 7);
  
  yPos += 9;
  
  // ===================== DESTINATÁRIO/REMETENTE =====================
  doc.setFillColor(...lightGray);
  doc.rect(10, yPos, pageWidth - 20, 5, 'F');
  doc.rect(10, yPos, pageWidth - 20, 5);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('DESTINATÁRIO / REMETENTE', 12, yPos + 3.5);
  yPos += 5;
  
  // Row 1: Nome, CNPJ/CPF, Data emissão
  const destCol1 = 100;
  const destCol2 = 50;
  const destCol3 = pageWidth - 20 - destCol1 - destCol2;
  
  doc.rect(10, yPos, destCol1, 10);
  doc.rect(10 + destCol1, yPos, destCol2, 10);
  doc.rect(10 + destCol1 + destCol2, yPos, destCol3, 10);
  
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.text('NOME / RAZÃO SOCIAL', 12, yPos + 3);
  doc.text('CNPJ / CPF', 12 + destCol1 + 2, yPos + 3);
  doc.text('DATA DA EMISSÃO', 12 + destCol1 + destCol2 + 2, yPos + 3);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(quotation.customer?.name || '', 12, yPos + 8);
  doc.text(quotation.customer?.cnpj || '', 12 + destCol1 + 2, yPos + 8);
  doc.text(emissionDate, 12 + destCol1 + destCol2 + 2, yPos + 8);
  
  yPos += 10;
  
  // Row 2: Endereço, Bairro, CEP, Data saída
  const destRow2Cols = [70, 40, 25, pageWidth - 20 - 135];
  let xOffset = 10;
  
  doc.rect(xOffset, yPos, destRow2Cols[0], 10);
  doc.rect(xOffset + destRow2Cols[0], yPos, destRow2Cols[1], 10);
  doc.rect(xOffset + destRow2Cols[0] + destRow2Cols[1], yPos, destRow2Cols[2], 10);
  doc.rect(xOffset + destRow2Cols[0] + destRow2Cols[1] + destRow2Cols[2], yPos, destRow2Cols[3], 10);
  
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.text('ENDEREÇO', 12, yPos + 3);
  doc.text('BAIRRO / DISTRITO', 12 + destRow2Cols[0] + 2, yPos + 3);
  doc.text('CEP', 12 + destRow2Cols[0] + destRow2Cols[1] + 2, yPos + 3);
  doc.text('DATA DA SAÍDA/ENTRADA', 12 + destRow2Cols[0] + destRow2Cols[1] + destRow2Cols[2] + 2, yPos + 3);
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  const addressText = quotation.customer?.address || '';
  const addressLines = doc.splitTextToSize(addressText, destRow2Cols[0] - 4);
  doc.text(addressLines[0] || '', 12, yPos + 8);
  doc.text(emissionDate, 12 + destRow2Cols[0] + destRow2Cols[1] + destRow2Cols[2] + 2, yPos + 8);
  
  yPos += 10;
  
  // Row 3: Município, Fone, UF, Hora saída
  doc.rect(xOffset, yPos, destRow2Cols[0], 10);
  doc.rect(xOffset + destRow2Cols[0], yPos, destRow2Cols[1], 10);
  doc.rect(xOffset + destRow2Cols[0] + destRow2Cols[1], yPos, destRow2Cols[2], 10);
  doc.rect(xOffset + destRow2Cols[0] + destRow2Cols[1] + destRow2Cols[2], yPos, destRow2Cols[3], 10);
  
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.text('MUNICÍPIO', 12, yPos + 3);
  doc.text('FONE / FAX', 12 + destRow2Cols[0] + 2, yPos + 3);
  doc.text('UF', 12 + destRow2Cols[0] + destRow2Cols[1] + 2, yPos + 3);
  doc.text('HORA DA SAÍDA', 12 + destRow2Cols[0] + destRow2Cols[1] + destRow2Cols[2] + 2, yPos + 3);
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(quotation.customer?.phone || '', 12 + destRow2Cols[0] + 2, yPos + 8);
  doc.text(emissionTime, 12 + destRow2Cols[0] + destRow2Cols[1] + destRow2Cols[2] + 2, yPos + 8);
  
  yPos += 11;
  
  // ===================== CÁLCULO DO IMPOSTO =====================
  doc.setFillColor(...lightGray);
  doc.rect(10, yPos, pageWidth - 20, 5, 'F');
  doc.rect(10, yPos, pageWidth - 20, 5);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('CÁLCULO DO IMPOSTO', 12, yPos + 3.5);
  yPos += 5;
  
  // Tax calculation row 1
  const taxColWidth = (pageWidth - 20) / 6;
  for (let i = 0; i < 6; i++) {
    doc.rect(10 + taxColWidth * i, yPos, taxColWidth, 10);
  }
  
  const taxLabels1 = ['BASE DE CÁLCULO DO ICMS', 'VALOR DO ICMS', 'BASE DE CÁLC. ICMS ST', 'VALOR DO ICMS ST', 'V. IMP. IMPORTAÇÃO', 'V. TOT. PRODUTOS'];
  const taxValues1 = [
    formatCurrency(taxCalc.baseCalculo).replace('R$', '').trim(),
    formatCurrency(taxCalc.icmsValue).replace('R$', '').trim(),
    '0,00',
    '0,00',
    '0,00',
    formatCurrency(quotation.subtotal).replace('R$', '').trim(),
  ];
  
  doc.setFontSize(4.5);
  doc.setFont('helvetica', 'bold');
  for (let i = 0; i < 6; i++) {
    doc.text(taxLabels1[i], 12 + taxColWidth * i, yPos + 3);
  }
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  for (let i = 0; i < 6; i++) {
    doc.text(taxValues1[i], 12 + taxColWidth * i, yPos + 8);
  }
  
  yPos += 10;
  
  // Tax calculation row 2
  for (let i = 0; i < 6; i++) {
    doc.rect(10 + taxColWidth * i, yPos, taxColWidth, 10);
  }
  
  const taxLabels2 = ['VALOR DO FRETE', 'VALOR DO SEGURO', 'DESCONTO', 'OUTRAS DESP. ACESS.', 'VALOR DO IPI', 'VALOR TOTAL DA NOTA'];
  const freightValue = quotation.freight || 0;
  const taxValues2 = [
    freightValue === 0 ? '0,00' : formatCurrency(freightValue).replace('R$', '').trim(),
    '0,00',
    formatCurrency(quotation.discount).replace('R$', '').trim(),
    '0,00',
    '0,00',
    formatCurrency(quotation.total).replace('R$', '').trim(),
  ];
  
  doc.setFontSize(4.5);
  doc.setFont('helvetica', 'bold');
  for (let i = 0; i < 6; i++) {
    doc.text(taxLabels2[i], 12 + taxColWidth * i, yPos + 3);
  }
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  for (let i = 0; i < 5; i++) {
    doc.text(taxValues2[i], 12 + taxColWidth * i, yPos + 8);
  }
  // Total in bold
  doc.setFont('helvetica', 'bold');
  doc.text(taxValues2[5], 12 + taxColWidth * 5, yPos + 8);
  
  yPos += 11;
  
  // ===================== DADOS DO PRODUTO / SERVIÇO =====================
  doc.setFillColor(...lightGray);
  doc.rect(10, yPos, pageWidth - 20, 5, 'F');
  doc.rect(10, yPos, pageWidth - 20, 5);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO PRODUTO / SERVIÇO', 12, yPos + 3.5);
  yPos += 5;
  
  // Products table
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
      item.quantity.toFixed(2).replace('.', ','),
      formatCurrency(item.unitPrice).replace('R$', '').trim(),
      formatCurrency(item.subtotal).replace('R$', '').trim(),
      formatCurrency(item.subtotal).replace('R$', '').trim(),
      formatCurrency(itemTax).replace('R$', '').trim(),
      `${(DEFAULT_TAX_RATES.icms * 100).toFixed(0)}%`,
    ];
  });
  
  autoTable(doc, {
    startY: yPos,
    head: [['CÓD.', 'DESCRIÇÃO DO PRODUTO / SERVIÇO', 'NCM/SH', 'CST', 'CFOP', 'UN', 'QUANT.', 'VL. UNIT.', 'VL. TOTAL', 'BC ICMS', 'VL. ICMS', 'ALÍQ.']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [245, 245, 245],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 5,
      halign: 'center',
      cellPadding: 1.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    bodyStyles: {
      fontSize: 6,
      textColor: [0, 0, 0],
      cellPadding: 2,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 50, halign: 'left' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 10, halign: 'center' },
      4: { cellWidth: 12, halign: 'center' },
      5: { cellWidth: 10, halign: 'center' },
      6: { cellWidth: 14, halign: 'right' },
      7: { cellWidth: 16, halign: 'right' },
      8: { cellWidth: 16, halign: 'right' },
      9: { cellWidth: 16, halign: 'right' },
      10: { cellWidth: 14, halign: 'right' },
      11: { cellWidth: 10, halign: 'center' },
    },
    margin: { left: 10, right: 10 },
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.2,
  });
  
  let finalY = (doc as any).lastAutoTable.finalY + 2;
  
  // ===================== DADOS ADICIONAIS =====================
  doc.setFillColor(...lightGray);
  doc.rect(10, finalY, pageWidth - 20, 5, 'F');
  doc.rect(10, finalY, pageWidth - 20, 5);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS ADICIONAIS', 12, finalY + 3.5);
  finalY += 5;
  
  const addDataWidth = (pageWidth - 20) / 2;
  doc.rect(10, finalY, addDataWidth, 28);
  doc.rect(10 + addDataWidth, finalY, addDataWidth, 28);
  
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMAÇÕES COMPLEMENTARES', 12, finalY + 3);
  doc.text('RESERVADO AO FISCO', 12 + addDataWidth + 2, finalY + 3);
  
  // Tax summary
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  const taxSummary = `Trib. Aprox.: ${formatCurrency(taxCalc.totalTaxes)} (${taxCalc.taxPercentage.toFixed(2)}%) ` +
    `Fed.: ${formatCurrency(taxCalc.pisValue + taxCalc.cofinsValue)} ` +
    `Est.: ${formatCurrency(taxCalc.icmsValue)} Fonte: IBPT`;
  
  doc.text(taxSummary, 12, finalY + 8);
  
  // Additional info
  doc.text(`Ref.: ${quotation.number}`, 12, finalY + 13);
  doc.text(`Cond. Pgto: ${quotation.paymentConditions?.cashDiscount || ''} | ${quotation.paymentConditions?.installments || ''}`, 12, finalY + 18);
  doc.text(`Prazo: ${quotation.deliveryTime}`, 12, finalY + 23);
  
  return doc;
};

export const downloadNFePDF = async (quotation: Quotation, nfeNumber: string) => {
  const doc = await generateNFePDF(quotation, nfeNumber);
  doc.save(`NFe_${nfeNumber}_${quotation.customer?.name?.replace(/\s/g, '_') || 'Cliente'}.pdf`);
};
