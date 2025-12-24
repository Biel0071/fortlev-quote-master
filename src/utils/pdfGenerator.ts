import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Quotation } from '@/types/quotation';
import { formatCurrency, formatDate } from './formatters';

export const generatePDF = (quotation: Quotation): jsPDF => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header background
  doc.setFillColor(10, 37, 64); // Navy blue
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  // Company name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('FORTLEV', 20, 25);
  
  // Tagline
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Caixas d\'Água de Polietileno', 20, 35);
  
  // Quotation badge
  doc.setFillColor(247, 181, 0); // Yellow
  doc.roundedRect(pageWidth - 70, 12, 55, 22, 3, 3, 'F');
  doc.setTextColor(10, 37, 64);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ORÇAMENTO', pageWidth - 65, 21);
  doc.setFontSize(11);
  doc.text(quotation.number, pageWidth - 65, 30);
  
  // Reset text color
  doc.setTextColor(30, 30, 30);
  
  // Date and validity
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data: ${formatDate(quotation.createdAt)}`, 20, 55);
  doc.text(`Validade: ${quotation.validity}`, 20, 62);
  
  // Customer section
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(15, 70, pageWidth - 30, 35, 3, 3, 'F');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 37, 64);
  doc.text('DADOS DO CLIENTE', 20, 80);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text(`Nome: ${quotation.customer.name}`, 20, 89);
  doc.text(`Telefone: ${quotation.customer.phone}`, 20, 96);
  doc.text(`Endereço: ${quotation.customer.address}`, pageWidth / 2 - 10, 89);
  
  // Items table
  const tableData = quotation.items.map(item => [
    `${item.product.name} - ${item.product.capacity}${item.product.unit}`,
    `${item.product.height} x ${item.product.diameter}`,
    item.quantity.toString(),
    formatCurrency(item.unitPrice),
    formatCurrency(item.subtotal),
  ]);
  
  autoTable(doc, {
    startY: 115,
    head: [['Produto', 'Dimensões (A x D)', 'Qtd.', 'Valor Unit.', 'Subtotal']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [10, 37, 64],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [50, 50, 50],
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 40, halign: 'center' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
    },
    alternateRowStyles: {
      fillColor: [250, 251, 252],
    },
  });
  
  // Get final Y position after table
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  // Total section
  doc.setFillColor(10, 37, 64);
  doc.roundedRect(pageWidth - 85, finalY, 70, 20, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', pageWidth - 80, finalY + 9);
  doc.setFontSize(12);
  doc.text(formatCurrency(quotation.total), pageWidth - 80, finalY + 16);
  
  // Observations
  if (quotation.observations) {
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Observações:', 20, finalY + 35);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    const splitObs = doc.splitTextToSize(quotation.observations, pageWidth - 40);
    doc.text(splitObs, 20, finalY + 43);
  }
  
  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 25;
  doc.setDrawColor(200, 200, 200);
  doc.line(20, footerY, pageWidth - 20, footerY);
  
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('Este orçamento é válido somente com assinatura e carimbo da empresa.', pageWidth / 2, footerY + 8, { align: 'center' });
  doc.text('Preços sujeitos a alteração sem aviso prévio.', pageWidth / 2, footerY + 14, { align: 'center' });
  
  // Watermark
  doc.setTextColor(230, 235, 240);
  doc.setFontSize(60);
  doc.setFont('helvetica', 'bold');
  doc.text('FORTLEV', pageWidth / 2, doc.internal.pageSize.getHeight() / 2, {
    align: 'center',
    angle: 45,
  });
  
  return doc;
};

export const downloadPDF = (quotation: Quotation) => {
  const doc = generatePDF(quotation);
  doc.save(`Orcamento_${quotation.number}_${quotation.customer.name.replace(/\s/g, '_')}.pdf`);
};
