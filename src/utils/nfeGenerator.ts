import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Quotation } from '@/types/quotation';
import { formatCurrency, formatDate } from './formatters';

export const generateNFePDF = (quotation: Quotation, nfeNumber: string): jsPDF => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Colors
  const primaryBlue = [0, 82, 147] as const;
  const darkBlue = [0, 51, 102] as const;
  const white = [255, 255, 255] as const;
  const lightGray = [245, 247, 250] as const;
  const textDark = [30, 30, 30] as const;
  
  // Header bar
  doc.setFillColor(...primaryBlue);
  doc.rect(0, 0, pageWidth, 12, 'F');
  
  doc.setTextColor(...white);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DOCUMENTO AUXILIAR DA NOTA FISCAL ELETRÔNICA', pageWidth / 2, 8, { align: 'center' });
  
  // Title section
  doc.setFillColor(...lightGray);
  doc.rect(0, 12, pageWidth, 25, 'F');
  
  doc.setTextColor(...darkBlue);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('DANFE', 15, 28);
  
  // NFe Number
  doc.setFontSize(12);
  doc.text(`NFe nº ${nfeNumber}`, pageWidth - 15, 22, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Série: 001 | Emissão: ${formatDate(new Date())}`, pageWidth - 15, 30, { align: 'right' });
  
  let yPos = 45;
  
  // Emitente section
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(15, yPos, pageWidth - 30, 35);
  
  doc.setTextColor(...primaryBlue);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('EMITENTE', 18, yPos + 5);
  
  doc.setTextColor(...textDark);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(quotation.companyInfo.name || 'Empresa Emitente', 18, yPos + 13);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (quotation.companyInfo.cnpj) {
    doc.text(`CNPJ: ${quotation.companyInfo.cnpj}`, 18, yPos + 20);
  }
  if (quotation.companyInfo.address) {
    doc.text(`Endereço: ${quotation.companyInfo.address}`, 18, yPos + 26);
  }
  if (quotation.companyInfo.phone) {
    doc.text(`Telefone: ${quotation.companyInfo.phone}`, 18, yPos + 32);
  }
  
  yPos += 42;
  
  // Destinatário section
  doc.rect(15, yPos, pageWidth - 30, 35);
  
  doc.setTextColor(...primaryBlue);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('DESTINATÁRIO / REMETENTE', 18, yPos + 5);
  
  doc.setTextColor(...textDark);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(quotation.customer.name, 18, yPos + 13);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (quotation.customer.cnpj) {
    doc.text(`CNPJ/CPF: ${quotation.customer.cnpj}`, 18, yPos + 20);
  }
  if (quotation.customer.address) {
    doc.text(`Endereço: ${quotation.customer.address}`, 18, yPos + 26);
  }
  if (quotation.customer.phone) {
    doc.text(`Telefone: ${quotation.customer.phone}`, 18, yPos + 32);
  }
  
  yPos += 42;
  
  // Products table
  const tableData = quotation.items.map((item, index) => [
    (index + 1).toString(),
    `Caixa d'água Fortlev ${item.product.capacity} ${item.product.unit}`,
    'UN',
    item.quantity.toString(),
    formatCurrency(item.unitPrice).replace('R$', '').trim(),
    formatCurrency(item.subtotal).replace('R$', '').trim(),
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Descrição do Produto', 'Un.', 'Qtd.', 'Valor Unit. (R$)', 'Valor Total (R$)']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [0, 82, 147],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 30, 30],
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 70, halign: 'left' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 30, halign: 'right' },
    },
    alternateRowStyles: {
      fillColor: [250, 251, 252],
    },
    margin: { left: 15, right: 15 },
  });
  
  let finalY = (doc as any).lastAutoTable.finalY + 8;
  
  // Totals section
  const totalsX = pageWidth - 80;
  const totalsWidth = 65;
  
  doc.setDrawColor(200, 200, 200);
  
  // Subtotal
  doc.rect(totalsX, finalY, totalsWidth, 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Subtotal:', totalsX + 3, finalY + 5.5);
  doc.text(formatCurrency(quotation.subtotal).replace('R$', '').trim(), totalsX + totalsWidth - 3, finalY + 5.5, { align: 'right' });
  finalY += 8;
  
  // Discount
  doc.rect(totalsX, finalY, totalsWidth, 8);
  doc.text('Desconto:', totalsX + 3, finalY + 5.5);
  doc.text(formatCurrency(quotation.discount).replace('R$', '').trim(), totalsX + totalsWidth - 3, finalY + 5.5, { align: 'right' });
  finalY += 8;
  
  // Freight
  doc.rect(totalsX, finalY, totalsWidth, 8);
  doc.text('Frete:', totalsX + 3, finalY + 5.5);
  const freightValue = quotation.freight || 0;
  const freightText = freightValue === 0 ? 'Grátis' : formatCurrency(freightValue).replace('R$', '').trim();
  doc.text(freightText, totalsX + totalsWidth - 3, finalY + 5.5, { align: 'right' });
  finalY += 8;
  
  // Total
  doc.setFillColor(...primaryBlue);
  doc.rect(totalsX, finalY, totalsWidth, 10, 'F');
  doc.setTextColor(...white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL:', totalsX + 3, finalY + 7);
  doc.text(`R$ ${formatCurrency(quotation.total).replace('R$', '').trim()}`, totalsX + totalsWidth - 3, finalY + 7, { align: 'right' });
  finalY += 18;
  
  // Informações adicionais
  doc.setTextColor(...textDark);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMAÇÕES ADICIONAIS', 15, finalY);
  finalY += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  
  const infoText = [
    `Orçamento de referência: ${quotation.number}`,
    `Condições de pagamento: ${quotation.paymentConditions.cashDiscount} | ${quotation.paymentConditions.installments}`,
    `Prazo de entrega: ${quotation.deliveryTime}`,
    quotation.observations ? `Observações: ${quotation.observations}` : '',
  ].filter(Boolean);
  
  doc.rect(15, finalY, pageWidth - 30, 20);
  infoText.forEach((text, index) => {
    doc.text(text, 18, finalY + 5 + (index * 4));
  });
  
  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(...primaryBlue);
  doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');
  
  doc.setTextColor(...white);
  doc.setFontSize(7);
  doc.text('DOCUMENTO SEM VALOR FISCAL - APENAS PARA FINS DE CONTROLE INTERNO', pageWidth / 2, pageHeight - 4, { align: 'center' });
  
  return doc;
};

export const downloadNFePDF = (quotation: Quotation, nfeNumber: string) => {
  const doc = generateNFePDF(quotation, nfeNumber);
  doc.save(`NFe_${nfeNumber}_${quotation.customer.name.replace(/\s/g, '_')}.pdf`);
};
