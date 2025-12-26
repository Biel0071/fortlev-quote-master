import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Quotation } from '@/types/quotation';
import { formatCurrency, formatDate } from './formatters';

export const generatePDF = (quotation: Quotation): jsPDF => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Colors
  const primaryBlue = [0, 82, 147] as const;
  const darkBlue = [0, 51, 102] as const;
  const white = [255, 255, 255] as const;
  const lightGray = [245, 247, 250] as const;
  const textDark = [30, 30, 30] as const;
  const textGray = [100, 100, 100] as const;
  
  // Header bar
  doc.setFillColor(...primaryBlue);
  doc.rect(0, 0, pageWidth, 8, 'F');
  
  // Title section
  doc.setFillColor(...lightGray);
  doc.rect(0, 8, pageWidth, 20, 'F');
  
  doc.setTextColor(...darkBlue);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('ORÇAMENTO OFICIAL', 15, 22);
  
  // FORTLEV text logo
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryBlue);
  doc.text('FORTLEV', pageWidth - 15, 22, { align: 'right' });
  
  // Company info section
  let yPos = 38;
  doc.setFontSize(9);
  doc.setTextColor(...textDark);
  
  if (quotation.companyInfo.name) {
    doc.setFont('helvetica', 'normal');
    doc.text('Emitido por: ', 15, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(quotation.companyInfo.name, 37, yPos);
    
    // Date and validity on right
    doc.setFont('helvetica', 'normal');
    doc.text(`Data de Emissão: ${formatDate(quotation.createdAt)}`, pageWidth - 15, yPos, { align: 'right' });
    yPos += 6;
  }
  
  if (quotation.companyInfo.cnpj) {
    doc.text(`CNPJ: ${quotation.companyInfo.cnpj}`, 15, yPos);
    doc.text(`Validade: ${quotation.validity}`, pageWidth - 15, yPos, { align: 'right' });
    yPos += 6;
  }
  
  if (quotation.companyInfo.address) {
    doc.text(`Endereço: ${quotation.companyInfo.address}`, 15, yPos);
    yPos += 6;
  }
  
  if (quotation.companyInfo.phone) {
    doc.text(`Telefone / WhatsApp: ${quotation.companyInfo.phone}`, 15, yPos);
    yPos += 6;
  }
  
  if (quotation.companyInfo.email) {
    doc.text(`E-mail: ${quotation.companyInfo.email}`, 15, yPos);
    yPos += 6;
  }
  
  if (quotation.companyInfo.website) {
    doc.text(`Site: ${quotation.companyInfo.website}`, 15, yPos);
    yPos += 6;
  }
  
  yPos += 4;
  
  // Quotation number line
  doc.setDrawColor(200, 200, 200);
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 6;
  
  doc.setFont('helvetica', 'bold');
  doc.text(`Orçamento nº: ${quotation.number}`, 15, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data de Emissão: ${formatDate(quotation.createdAt)}`, pageWidth / 2, yPos);
  yPos += 6;
  
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 6;
  
  // Client section
  if (quotation.showClientData && quotation.customer.name) {
    doc.setFont('helvetica', 'bold');
    doc.text('Cliente:', 15, yPos);
    yPos += 6;
    
    doc.setFont('helvetica', 'bold');
    doc.text(quotation.customer.name, 15, yPos);
    yPos += 5;
    
    doc.setFont('helvetica', 'normal');
    if (quotation.customer.cnpj) {
      doc.text(`CNPJ: ${quotation.customer.cnpj}`, 15, yPos);
      yPos += 5;
    }
    
    if (quotation.customer.address) {
      doc.text(`Endereço de entrega: ${quotation.customer.address}`, 15, yPos);
      yPos += 5;
    }
    
    if (quotation.customer.phone) {
      doc.text(`Telefone / WhatsApp: ${quotation.customer.phone}`, 15, yPos);
      yPos += 5;
    }
    
    yPos += 4;
  }
  
  // Items table
  const tableData = quotation.items.map(item => [
    `Caixa d'água Fortlev ${item.product.capacity} ${item.product.unit}`,
    'Un.',
    item.quantity.toString(),
    formatCurrency(item.unitPrice).replace('R$', '').trim(),
    formatCurrency(item.subtotal).replace('R$', '').trim(),
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Itens Orçados', 'Un.', 'Qtd.', 'Valor Unit. (R$)', 'Total (R$)']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [0, 82, 147],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left',
      cellPadding: 4,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [30, 30, 30],
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 75, halign: 'left' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
    },
    alternateRowStyles: {
      fillColor: [250, 251, 252],
    },
    margin: { left: 15, right: 15 },
  });
  
  // Get final Y position after table
  let finalY = (doc as any).lastAutoTable.finalY + 5;
  
  // Totals section - right aligned
  const totalsX = pageWidth - 80;
  const totalsWidth = 65;
  
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(...white);
  
  // Subtotal row
  doc.rect(totalsX, finalY, totalsWidth, 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Subtotal:', totalsX + 3, finalY + 5.5);
  doc.text(formatCurrency(quotation.subtotal).replace('R$', '').trim(), totalsX + totalsWidth - 3, finalY + 5.5, { align: 'right' });
  finalY += 8;
  
  // Discount row
  doc.rect(totalsX, finalY, totalsWidth, 8);
  doc.text('Desconto:', totalsX + 3, finalY + 5.5);
  doc.text(formatCurrency(quotation.discount).replace('R$', '').trim(), totalsX + totalsWidth - 3, finalY + 5.5, { align: 'right' });
  finalY += 8;
  
  // Total row
  doc.setFillColor(...primaryBlue);
  doc.rect(totalsX, finalY, totalsWidth, 10, 'F');
  doc.setTextColor(...white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Total Geral:', totalsX + 3, finalY + 7);
  doc.text(`R$ ${formatCurrency(quotation.total).replace('R$', '').trim()}`, totalsX + totalsWidth - 3, finalY + 7, { align: 'right' });
  finalY += 18;
  
  // Payment conditions
  doc.setTextColor(...textDark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Condições de Pagamento:', 15, finalY);
  finalY += 7;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  if (quotation.paymentConditions.cashDiscount) {
    doc.text(`• À vista: ${quotation.paymentConditions.cashDiscount}`, 15, finalY);
    finalY += 5;
  }
  
  if (quotation.paymentConditions.installments) {
    doc.text(`• Parcelado: ${quotation.paymentConditions.installments}`, 15, finalY);
    finalY += 5;
  }
  
  if (quotation.paymentConditions.downPayment) {
    doc.text(`• Entrada mínima de ${quotation.paymentConditions.downPayment} no fechamento.`, 15, finalY);
    finalY += 5;
  }
  
  finalY += 5;
  
  // Additional info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Informações Adicionais:', 15, finalY);
  finalY += 7;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  if (quotation.deliveryTime) {
    doc.text(`• Prazo de entrega: `, 15, finalY);
    doc.setFont('helvetica', 'bold');
    doc.text(quotation.deliveryTime, 43, finalY);
    doc.setFont('helvetica', 'normal');
    doc.text(' após confirmação do pagamento.', 43 + doc.getTextWidth(quotation.deliveryTime), finalY);
    finalY += 5;
  }
  
  doc.text('• Instalação realizada por equipe especializada.', 15, finalY);
  finalY += 5;
  doc.text('• Valores sujeitos a alteração sem aviso prévio.', 15, finalY);
  finalY += 5;
  
  if (quotation.observations) {
    const splitObs = doc.splitTextToSize(`• ${quotation.observations}`, pageWidth - 30);
    doc.text(splitObs, 15, finalY);
    finalY += splitObs.length * 5;
  }
  
  finalY += 10;
  
  // Signature section
  doc.text('Atenciosamente,', 15, finalY);
  finalY += 7;
  
  doc.setFont('helvetica', 'bold');
  doc.text(quotation.companyInfo.sellerName || 'Vendedor', 15, finalY);
  finalY += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textGray);
  doc.text(quotation.companyInfo.sellerRole || 'Gerente de Vendas', 15, finalY);
  finalY += 5;
  doc.text(quotation.companyInfo.name || 'Empresa', 15, finalY);
  
  // Footer bar
  doc.setFillColor(...primaryBlue);
  doc.rect(0, doc.internal.pageSize.getHeight() - 8, pageWidth, 8, 'F');
  
  return doc;
};

export const downloadPDF = (quotation: Quotation) => {
  const doc = generatePDF(quotation);
  doc.save(`Orcamento_${quotation.number}_${quotation.customer.name.replace(/\s/g, '_')}.pdf`);
};

export const downloadPNG = async (quotation: Quotation) => {
  const doc = generatePDF(quotation);
  
  // Convert PDF to image using canvas
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  
  // Use pdf.js or convert via canvas - simplified approach using jspdf output
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Set canvas size (A4 at 150 DPI)
  canvas.width = 1240;
  canvas.height = 1754;
  
  if (ctx) {
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Create image from PDF data URL
    const pdfDataUrl = doc.output('datauristring');
    
    // Since direct PDF to PNG is complex, we'll use an alternative approach
    // Generate an HTML canvas representation
    const img = new Image();
    
    return new Promise<void>((resolve) => {
      // Use svg output for better quality
      const svgString = doc.output('datauristring');
      
      // Fallback: download PDF and notify user
      // For PNG, we'll create a simpler canvas-based version
      generateCanvasPNG(quotation);
      resolve();
    });
  }
  
  URL.revokeObjectURL(pdfUrl);
};

const generateCanvasPNG = (quotation: Quotation) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // A4 dimensions at 150 DPI
  canvas.width = 1240;
  canvas.height = 1754;
  
  if (!ctx) return;
  
  const scale = canvas.width / 210; // mm to pixels
  
  // Colors
  const primaryBlue = '#005293';
  const darkBlue = '#003366';
  const lightGray = '#f5f7fa';
  const textDark = '#1e1e1e';
  const textGray = '#646464';
  
  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Top bar
  ctx.fillStyle = primaryBlue;
  ctx.fillRect(0, 0, canvas.width, 50);
  
  // Title section
  ctx.fillStyle = lightGray;
  ctx.fillRect(0, 50, canvas.width, 80);
  
  ctx.fillStyle = darkBlue;
  ctx.font = 'bold 36px Helvetica';
  ctx.fillText('ORÇAMENTO OFICIAL', 60, 105);
  
  ctx.fillStyle = primaryBlue;
  ctx.font = 'bold 44px Helvetica';
  ctx.fillText('FORTLEV', canvas.width - 220, 105);
  
  // Company info
  let yPos = 170;
  ctx.fillStyle = textDark;
  ctx.font = '18px Helvetica';
  
  if (quotation.companyInfo.name) {
    ctx.fillText(`Emitido por: ${quotation.companyInfo.name}`, 60, yPos);
    ctx.fillText(`Data de Emissão: ${formatDate(quotation.createdAt)}`, canvas.width - 350, yPos);
    yPos += 28;
  }
  
  if (quotation.companyInfo.cnpj) {
    ctx.fillText(`CNPJ: ${quotation.companyInfo.cnpj}`, 60, yPos);
    ctx.fillText(`Validade: ${quotation.validity}`, canvas.width - 350, yPos);
    yPos += 28;
  }
  
  if (quotation.companyInfo.address) {
    ctx.fillText(`Endereço: ${quotation.companyInfo.address}`, 60, yPos);
    yPos += 28;
  }
  
  if (quotation.companyInfo.phone) {
    ctx.fillText(`Telefone / WhatsApp: ${quotation.companyInfo.phone}`, 60, yPos);
    yPos += 28;
  }
  
  if (quotation.companyInfo.email) {
    ctx.fillText(`E-mail: ${quotation.companyInfo.email}`, 60, yPos);
    yPos += 28;
  }
  
  if (quotation.companyInfo.website) {
    ctx.fillText(`Site: ${quotation.companyInfo.website}`, 60, yPos);
    yPos += 28;
  }
  
  yPos += 10;
  
  // Divider
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, yPos);
  ctx.lineTo(canvas.width - 60, yPos);
  ctx.stroke();
  yPos += 30;
  
  // Quotation number
  ctx.font = 'bold 18px Helvetica';
  ctx.fillText(`Orçamento nº: ${quotation.number}`, 60, yPos);
  ctx.font = '18px Helvetica';
  ctx.fillText(`Data de Emissão: ${formatDate(quotation.createdAt)}`, canvas.width / 2, yPos);
  yPos += 30;
  
  // Divider
  ctx.beginPath();
  ctx.moveTo(60, yPos);
  ctx.lineTo(canvas.width - 60, yPos);
  ctx.stroke();
  yPos += 30;
  
  // Client section
  if (quotation.showClientData && quotation.customer.name) {
    ctx.font = 'bold 18px Helvetica';
    ctx.fillText('Cliente:', 60, yPos);
    yPos += 28;
    
    ctx.font = 'bold 18px Helvetica';
    ctx.fillText(quotation.customer.name, 60, yPos);
    yPos += 24;
    
    ctx.font = '18px Helvetica';
    if (quotation.customer.cnpj) {
      ctx.fillText(`CNPJ: ${quotation.customer.cnpj}`, 60, yPos);
      yPos += 24;
    }
    
    if (quotation.customer.address) {
      ctx.fillText(`Endereço de entrega: ${quotation.customer.address}`, 60, yPos);
      yPos += 24;
    }
    
    if (quotation.customer.phone) {
      ctx.fillText(`Telefone / WhatsApp: ${quotation.customer.phone}`, 60, yPos);
      yPos += 24;
    }
    
    yPos += 20;
  }
  
  // Table header
  ctx.fillStyle = primaryBlue;
  ctx.fillRect(60, yPos, canvas.width - 120, 40);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px Helvetica';
  ctx.fillText('Itens Orçados', 70, yPos + 26);
  ctx.fillText('Un.', 520, yPos + 26);
  ctx.fillText('Qtd.', 600, yPos + 26);
  ctx.fillText('Valor Unit. (R$)', 680, yPos + 26);
  ctx.fillText('Total (R$)', 870, yPos + 26);
  yPos += 40;
  
  // Table rows
  ctx.font = '16px Helvetica';
  quotation.items.forEach((item, index) => {
    ctx.fillStyle = index % 2 === 0 ? '#ffffff' : '#fafbfc';
    ctx.fillRect(60, yPos, canvas.width - 120, 36);
    
    ctx.strokeStyle = '#e0e0e0';
    ctx.strokeRect(60, yPos, canvas.width - 120, 36);
    
    ctx.fillStyle = textDark;
    ctx.fillText(`Caixa d'água Fortlev ${item.product.capacity} ${item.product.unit}`, 70, yPos + 24);
    ctx.fillText('Un.', 530, yPos + 24);
    ctx.fillText(item.quantity.toString(), 615, yPos + 24);
    ctx.fillText(formatCurrency(item.unitPrice).replace('R$', '').trim(), 710, yPos + 24);
    ctx.fillText(formatCurrency(item.subtotal).replace('R$', '').trim(), 880, yPos + 24);
    yPos += 36;
  });
  
  yPos += 20;
  
  // Totals
  const totalsX = canvas.width - 320;
  
  ctx.strokeStyle = '#cccccc';
  ctx.strokeRect(totalsX, yPos, 260, 32);
  ctx.fillStyle = textDark;
  ctx.font = '16px Helvetica';
  ctx.fillText('Subtotal:', totalsX + 10, yPos + 22);
  ctx.fillText(formatCurrency(quotation.subtotal).replace('R$', '').trim(), totalsX + 240, yPos + 22);
  yPos += 32;
  
  ctx.strokeRect(totalsX, yPos, 260, 32);
  ctx.fillText('Desconto:', totalsX + 10, yPos + 22);
  ctx.fillText(formatCurrency(quotation.discount).replace('R$', '').trim(), totalsX + 240, yPos + 22);
  yPos += 32;
  
  ctx.fillStyle = primaryBlue;
  ctx.fillRect(totalsX, yPos, 260, 40);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px Helvetica';
  ctx.fillText('Total Geral:', totalsX + 10, yPos + 27);
  ctx.fillText(`R$ ${formatCurrency(quotation.total).replace('R$', '').trim()}`, totalsX + 220, yPos + 27);
  yPos += 60;
  
  // Payment conditions
  ctx.fillStyle = textDark;
  ctx.font = 'bold 18px Helvetica';
  ctx.fillText('Condições de Pagamento:', 60, yPos);
  yPos += 28;
  
  ctx.font = '16px Helvetica';
  if (quotation.paymentConditions.cashDiscount) {
    ctx.fillText(`• À vista: ${quotation.paymentConditions.cashDiscount}`, 60, yPos);
    yPos += 24;
  }
  
  if (quotation.paymentConditions.installments) {
    ctx.fillText(`• Parcelado: ${quotation.paymentConditions.installments}`, 60, yPos);
    yPos += 24;
  }
  
  if (quotation.paymentConditions.downPayment) {
    ctx.fillText(`• Entrada mínima de ${quotation.paymentConditions.downPayment} no fechamento.`, 60, yPos);
    yPos += 24;
  }
  
  yPos += 20;
  
  // Additional info
  ctx.font = 'bold 18px Helvetica';
  ctx.fillText('Informações Adicionais:', 60, yPos);
  yPos += 28;
  
  ctx.font = '16px Helvetica';
  if (quotation.deliveryTime) {
    ctx.fillText(`• Prazo de entrega: ${quotation.deliveryTime} após confirmação do pagamento.`, 60, yPos);
    yPos += 24;
  }
  
  ctx.fillText('• Instalação realizada por equipe especializada.', 60, yPos);
  yPos += 24;
  ctx.fillText('• Valores sujeitos a alteração sem aviso prévio.', 60, yPos);
  yPos += 24;
  
  if (quotation.observations) {
    ctx.fillText(`• ${quotation.observations}`, 60, yPos);
    yPos += 24;
  }
  
  yPos += 30;
  
  // Signature
  ctx.fillText('Atenciosamente,', 60, yPos);
  yPos += 28;
  
  ctx.font = 'bold 18px Helvetica';
  ctx.fillText(quotation.companyInfo.sellerName || 'Vendedor', 60, yPos);
  yPos += 24;
  
  ctx.font = '16px Helvetica';
  ctx.fillStyle = textGray;
  ctx.fillText(quotation.companyInfo.sellerRole || 'Gerente de Vendas', 60, yPos);
  yPos += 24;
  ctx.fillText(quotation.companyInfo.name || 'Empresa', 60, yPos);
  
  // Bottom bar
  ctx.fillStyle = primaryBlue;
  ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
  
  // Download PNG
  const link = document.createElement('a');
  link.download = `Orcamento_${quotation.number}_${quotation.customer.name.replace(/\s/g, '_')}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
};
