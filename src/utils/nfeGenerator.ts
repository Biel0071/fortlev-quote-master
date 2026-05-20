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
  const barWidth = width / 44;
  doc.setFillColor(0, 0, 0);
  for (let i = 0; i < 44; i++) {
    if (Math.random() > 0.3) {
      const w = Math.random() > 0.5 ? barWidth : barWidth * 1.5;
      doc.rect(x + (i * barWidth), y, w, height, 'F');
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

  // 1. RECEBIMENTO (CANHOTO)
  doc.setDrawColor(...primaryBlack);
  doc.rect(margin, y, contentWidth * 0.8, 15);
  doc.setFontSize(5);
  doc.text(`RECEBEMOS DE ${quotation.companyInfo.name || 'EMISSOR'} OS PRODUTOS E/OU SERVIÇOS CONSTANTES DA NOTA FISCAL ELETRÔNICA INDICADA ABAIXO.`, margin + 2, y + 4);
  doc.line(margin, y + 8, margin + contentWidth * 0.8, y + 8);
  doc.text('DATA DE RECEBIMENTO', margin + 2, y + 11);
  doc.text('IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR', margin + 40, y + 11);
  
  doc.rect(margin + contentWidth * 0.8, y, contentWidth * 0.2, 15);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('NF-e', margin + contentWidth * 0.8 + (contentWidth * 0.1), y + 5, { align: 'center' });
  doc.text(`Nº ${nfeNumber}`, margin + contentWidth * 0.8 + (contentWidth * 0.1), y + 10, { align: 'center' });
  doc.text('SÉRIE 1', margin + contentWidth * 0.8 + (contentWidth * 0.1), y + 13, { align: 'center' });

  y += 18;

  // 2. IDENTIFICAÇÃO DO EMITENTE & DANFE
  doc.rect(margin, y, contentWidth * 0.4, 30);
  doc.setFontSize(12);
  doc.text(quotation.companyInfo.name || 'EMISSOR', margin + 2, y + 8);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  const companyAddr = doc.splitTextToSize(quotation.companyInfo.address || '', (contentWidth * 0.4) - 4);
  doc.text(companyAddr, margin + 2, y + 12);
  doc.text(`Fone: ${quotation.companyInfo.phone || ''}`, margin + 2, y + 25);

  doc.rect(margin + contentWidth * 0.4, y, contentWidth * 0.15, 30);
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
  doc.text('1', margin + contentWidth * 0.51, y + 21);
  doc.setFontSize(7);
  doc.text(`Nº ${nfeNumber}`, margin + contentWidth * 0.475, y + 26, { align: 'center' });
  doc.text('SÉRIE 1', margin + contentWidth * 0.475, y + 28, { align: 'center' });

  doc.rect(margin + contentWidth * 0.55, y, contentWidth * 0.45, 30);
  drawBarcode(doc, accessKey, margin + contentWidth * 0.57, y + 2, contentWidth * 0.41, 10);
  doc.setFontSize(5);
  doc.text('CHAVE DE ACESSO', margin + contentWidth * 0.56, y + 15);
  doc.setFontSize(7);
  doc.text(formatAccessKey(accessKey), margin + contentWidth * 0.56, y + 18);
  doc.setFontSize(6);
  doc.text('Consulta de autenticidade no portal nacional da NF-e', margin + contentWidth * 0.56, y + 22);
  doc.text('www.nfe.fazenda.gov.br/portal ou no site da Sefaz Autorizadora', margin + contentWidth * 0.56, y + 24);

  y += 30;

  // 3. NATUREZA DA OPERAÇÃO & PROTOCOLO
  doc.rect(margin, y, contentWidth * 0.55, 10);
  doc.setFontSize(5);
  doc.text('NATUREZA DA OPERAÇÃO', margin + 2, y + 3);
  doc.setFontSize(8);
  doc.text('VENDA DE MERCADORIA', margin + 2, y + 8);

  doc.rect(margin + contentWidth * 0.55, y, contentWidth * 0.45, 10);
  doc.setFontSize(5);
  doc.text('PROTOCOLO DE AUTORIZAÇÃO DE USO', margin + contentWidth * 0.56, y + 3);
  doc.setFontSize(8);
  doc.text(`${protocolNumber} - ${emissionDate} ${emissionTime}`, margin + contentWidth * 0.56, y + 8);

  y += 10;

  // 4. INSCRIÇÃO ESTADUAL & CNPJ
  doc.rect(margin, y, contentWidth * 0.33, 10);
  doc.setFontSize(5);
  doc.text('INSCRIÇÃO ESTADUAL', margin + 2, y + 3);
  doc.setFontSize(8);
  doc.text('ISENTO', margin + 2, y + 8);

  doc.rect(margin + contentWidth * 0.33, y, contentWidth * 0.33, 10);
  doc.setFontSize(5);
  doc.text('INSCRIÇÃO ESTADUAL DO SUBST. TRIB.', margin + contentWidth * 0.34, y + 3);

  doc.rect(margin + contentWidth * 0.66, y, contentWidth * 0.34, 10);
  doc.setFontSize(5);
  doc.text('CNPJ', margin + contentWidth * 0.67, y + 3);
  doc.setFontSize(8);
  doc.text(quotation.companyInfo.cnpj || '', margin + contentWidth * 0.67, y + 8);

  y += 12;

  // 5. DESTINATÁRIO
  doc.setFillColor(...lightGray);
  doc.rect(margin, y, contentWidth, 5, 'F');
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('DESTINATÁRIO / REMETENTE', margin + 2, y + 3.5);
  y += 5;

  doc.rect(margin, y, contentWidth * 0.7, 10);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.text('NOME / RAZÃO SOCIAL', margin + 2, y + 3);
  doc.setFontSize(8);
  doc.text(quotation.customer.name || '', margin + 2, y + 8);

  doc.rect(margin + contentWidth * 0.7, y, contentWidth * 0.15, 10);
  doc.setFontSize(5);
  doc.text('CNPJ / CPF', margin + contentWidth * 0.71, y + 3);
  doc.setFontSize(7);
  doc.text(quotation.customer.cnpj || '', margin + contentWidth * 0.71, y + 8);

  doc.rect(margin + contentWidth * 0.85, y, contentWidth * 0.15, 10);
  doc.setFontSize(5);
  doc.text('DATA DA EMISSÃO', margin + contentWidth * 0.86, y + 3);
  doc.setFontSize(7);
  doc.text(emissionDate, margin + contentWidth * 0.86, y + 8);

  y += 10;

  doc.rect(margin, y, contentWidth * 0.5, 10);
  doc.setFontSize(5);
  doc.text('ENDEREÇO', margin + 2, y + 3);
  doc.setFontSize(7);
  doc.text(quotation.customer.address || '', margin + 2, y + 8);

  doc.rect(margin + contentWidth * 0.5, y, contentWidth * 0.2, 10);
  doc.setFontSize(5);
  doc.text('BAIRRO / DISTRITO', margin + contentWidth * 0.51, y + 3);

  doc.rect(margin + contentWidth * 0.7, y, contentWidth * 0.15, 10);
  doc.setFontSize(5);
  doc.text('CEP', margin + contentWidth * 0.71, y + 3);

  doc.rect(margin + contentWidth * 0.85, y, contentWidth * 0.15, 10);
  doc.setFontSize(5);
  doc.text('DATA SAÍDA / ENTRADA', margin + contentWidth * 0.86, y + 3);
  doc.setFontSize(7);
  doc.text(emissionDate, margin + contentWidth * 0.86, y + 8);

  y += 12;

  // 6. CÁLCULO DO IMPOSTO
  doc.setFillColor(...lightGray);
  doc.rect(margin, y, contentWidth, 5, 'F');
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('CÁLCULO DO IMPOSTO', margin + 2, y + 3.5);
  y += 5;

  const col = contentWidth / 5;
  for (let i = 0; i < 5; i++) {
    doc.rect(margin + (i * col), y, col, 10);
    doc.setFontSize(4);
    doc.setFont('helvetica', 'normal');
    const labels = ['BASE DE CÁLCULO DO ICMS', 'VALOR DO ICMS', 'BASE DE CÁLCULO ICMS S.T.', 'VALOR DO ICMS S.T.', 'VALOR TOTAL DOS PRODUTOS'];
    doc.text(labels[i], margin + (i * col) + 1, y + 3);
    doc.setFontSize(7);
    const values = [
      formatCurrency(taxCalc.baseCalculo).replace('R$', ''),
      formatCurrency(taxCalc.icmsValue).replace('R$', ''),
      '0,00', '0,00',
      formatCurrency(quotation.subtotal).replace('R$', '')
    ];
    doc.text(values[i].trim(), margin + (i * col) + col - 2, y + 8, { align: 'right' });
  }
  y += 10;

  for (let i = 0; i < 5; i++) {
    doc.rect(margin + (i * col), y, col, 10);
    doc.setFontSize(4);
    const labels = ['VALOR DO FRETE', 'VALOR DO SEGURO', 'DESCONTO', 'OUTRAS DESPESAS ACESSÓRIAS', 'VALOR TOTAL DA NOTA'];
    doc.text(labels[i], margin + (i * col) + 1, y + 3);
    doc.setFontSize(7);
    const values = [
      formatCurrency(quotation.freight || 0).replace('R$', ''),
      '0,00',
      formatCurrency(quotation.discount).replace('R$', ''),
      '0,00',
      formatCurrency(quotation.total).replace('R$', '')
    ];
    if (i === 4) doc.setFont('helvetica', 'bold');
    doc.text(values[i].trim(), margin + (i * col) + col - 2, y + 8, { align: 'right' });
  }

  y += 12;

  // 7. TRANSPORTADOR / VOLUMES
  doc.setFillColor(...lightGray);
  doc.rect(margin, y, contentWidth, 5, 'F');
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
  doc.text('0 - EMITENTE', margin + contentWidth * 0.4 + 1, y + 6);
  doc.rect(margin + contentWidth * 0.55, y, contentWidth * 0.1, 8);
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
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DOS PRODUTOS / SERVIÇOS', margin + 2, y + 3.5);
  y += 5;

  const tableData = quotation.items.map((item, index) => [
    (index + 1).toString().padStart(3, '0'),
    item.product.name + (item.product.capacity > 0 ? ` ${item.product.capacity}${item.product.unit}` : ''),
    getNcmCode(item.product.type),
    '000', '5102', 'UN', item.quantity.toString(),
    formatCurrency(item.unitPrice).replace('R$', '').trim(),
    formatCurrency(item.subtotal).replace('R$', '').trim(),
    '0,00', '0,00', '0,00'
  ]);

  autoTable(doc, {
    startY: y,
    head: [['CÓD', 'DESCRIÇÃO', 'NCM', 'CST', 'CFOP', 'UN', 'QTD', 'VL.UNIT', 'VL.TOT', 'BC ICMS', 'VL.ICMS', '%ICMS']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 5, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.1 },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    margin: { left: margin, right: margin }
  });

  y = (doc as any).lastAutoTable.finalY + 5;

  // 9. DADOS ADICIONAIS
  doc.setFillColor(...lightGray);
  doc.rect(margin, y, contentWidth, 5, 'F');
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS ADICIONAIS', margin + 2, y + 3.5);
  y += 5;

  doc.rect(margin, y, contentWidth * 0.6, 20);
  doc.setFontSize(4);
  doc.setFont('helvetica', 'normal');
  doc.text('INFORMAÇÕES COMPLEMENTARES', margin + 1, y + 3);
  doc.setFontSize(6);
  const obs = `Validade: ${quotation.validity} | Entrega: ${quotation.deliveryTime} | ${quotation.observations || ''}`;
  const splitObs = doc.splitTextToSize(obs, (contentWidth * 0.6) - 4);
  doc.text(splitObs, margin + 1, y + 7);

  doc.rect(margin + contentWidth * 0.6, y, contentWidth * 0.4, 20);
  doc.setFontSize(4);
  doc.text('RESERVADO AO FISCO', margin + contentWidth * 0.6 + 1, y + 3);

  return doc;
};

export const downloadNFePDF = async (quotation: Quotation, nfeNumber: string) => {
  const doc = await generateNFePDF(quotation, nfeNumber);
  doc.save(`DANFE_${nfeNumber}.pdf`);
};
