import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Quotation } from '@/types/quotation';
import { formatCurrency, formatDate, getBrazilDocumentLabel } from './formatters';
import { getProductFullDescription } from './taxCalculator';

export const generatePDF = (quotation: Quotation): jsPDF => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  const branding = quotation.branding ?? {
    showBrand: true,
    brandText: 'FORTLEV',
  };
  
  // Colors
  const black = [0, 0, 0] as const;
  const white = [255, 255, 255] as const;
  const fortlevBlue = [0, 74, 151] as const; // Real Fortlev Blue
  const fortlevRed = [231, 18, 18] as const; // Real Fortlev Red
  const textDark = [30, 30, 30] as const;
  
  // Header bar (Fortlev Blue)
  doc.setDrawColor(...fortlevBlue);
  doc.setFillColor(...fortlevBlue);
  doc.rect(0, 0, pageWidth, 12, 'F');
  
  // Title section
  doc.setTextColor(...white);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('ORÇAMENTO DE PRODUTOS', pageWidth / 2, 8, { align: 'center' });

  let yPos = 25;

  // Logo / Branding section
  if (branding.showBrand) {
    // Left side: Company Logo Placeholder/Text in Color
    doc.setDrawColor(...fortlevBlue);
    doc.setLineWidth(0.5);
    doc.rect(15, yPos, 60, 25);
    
    doc.setTextColor(...fortlevBlue);
    doc.setFontSize(18);
    doc.text(branding.brandText || 'FORTLEV', 45, yPos + 15, { align: 'center' });
    doc.setFontSize(7);
    doc.text('QUALIDADE EM PRIMEIRO LUGAR', 45, yPos + 20, { align: 'center' });
  }

  // Right side: Quotation Header info in color box
  doc.setFillColor(245, 247, 250);
  doc.rect(pageWidth - 85, yPos, 70, 25, 'F');
  doc.setDrawColor(...fortlevBlue);
  doc.rect(pageWidth - 85, yPos, 70, 25, 'S');

  doc.setTextColor(...fortlevBlue);
  doc.setFontSize(10);
  doc.text(`Orçamento: ${quotation.number}`, pageWidth - 50, yPos + 8, { align: 'center' });
  doc.setFontSize(8);
  doc.setTextColor(...fortlevRed);
  doc.text(`Válido até: ${quotation.validity}`, pageWidth - 50, yPos + 15, { align: 'center' });
  doc.setTextColor(...textDark);
  doc.text(`Emissão: ${formatDate(quotation.createdAt)}`, pageWidth - 50, yPos + 21, { align: 'center' });

  yPos += 35;

  
  // Company info section
  doc.setFontSize(10);
  doc.setTextColor(...fortlevBlue);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO EMISSOR', 15, yPos);
  yPos += 2;
  doc.setDrawColor(...fortlevBlue);
  doc.setLineWidth(0.2);
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 6;

  doc.setFontSize(9);
  doc.setTextColor(...textDark);
  
  if (quotation.companyInfo.name) {
    doc.setFont('helvetica', 'bold');
    doc.text(quotation.companyInfo.name, 15, yPos);
    yPos += 5;
  }
  
  doc.setFont('helvetica', 'normal');
  const companyDetails = [
    quotation.companyInfo.cnpj ? `CNPJ: ${quotation.companyInfo.cnpj}` : null,
    quotation.companyInfo.address ? `Endereço: ${quotation.companyInfo.address}` : null,
    quotation.companyInfo.phone ? `Fone: ${quotation.companyInfo.phone}` : null,
    quotation.companyInfo.email ? `E-mail: ${quotation.companyInfo.email}` : null
  ].filter(Boolean).join('  |  ');
  
  const splitDetails = doc.splitTextToSize(companyDetails, pageWidth - 30);
  doc.text(splitDetails, 15, yPos);
  yPos += (splitDetails.length * 5) + 5;
  
  // Client section
  if (quotation.showClientData && quotation.customer.name) {
    doc.setFontSize(10);
    doc.setTextColor(...fortlevBlue);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO CLIENTE', 15, yPos);
    yPos += 2;
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 6;

    doc.setFontSize(9);
    doc.setTextColor(...textDark);
    doc.setFont('helvetica', 'bold');
    doc.text(quotation.customer.name, 15, yPos);
    yPos += 5;
    
    doc.setFont('helvetica', 'normal');
    const customerDetails = [
      quotation.customer.cnpj ? `${getBrazilDocumentLabel(quotation.customer.cnpj)}: ${quotation.customer.cnpj}` : null,
      quotation.customer.phone ? `Fone: ${quotation.customer.phone}` : null,
      quotation.customer.address ? `Entrega: ${quotation.customer.address}` : null
    ].filter(Boolean).join('  |  ');

    const splitCust = doc.splitTextToSize(customerDetails, pageWidth - 30);
    doc.text(splitCust, 15, yPos);
    yPos += (splitCust.length * 5) + 5;
  }

  
  // Items table
  // - Fortlev: usa descrição completa (tipo + capacidade + unidade)
  // - Construção: usa o nome do produto (capacidade costuma ser 0)
  const tableData = quotation.items.map((item) => {
    const label = item.product.capacity > 0
      ? getProductFullDescription(item.product.type, item.product.capacity, item.product.unit)
      : item.product.name;

    return [
      label,
      "Un.",
      item.quantity.toString(),
      formatCurrency(item.unitPrice).replace("R$", "").trim(),
      formatCurrency(item.subtotal).replace("R$", "").trim(),
    ];
  });
  
  autoTable(doc, {
    startY: yPos,
    head: [['DADOS DO PRODUTO / SERVIÇO', 'Un.', 'Qtd.', 'Vlr. Unit.', 'Vlr. Total']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [0, 74, 151], // Fortlev Blue
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [0, 0, 0],
      cellPadding: 2,
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
    },
    columnStyles: {
      0: { cellWidth: 'auto', halign: 'left' },
      1: { cellWidth: 15, halign: 'center' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255],
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
  
  // Freight row
  doc.rect(totalsX, finalY, totalsWidth, 8);
  doc.text('Frete:', totalsX + 3, finalY + 5.5);
  const freightValue = quotation.freight || 0;
  const freightText = freightValue === 0 ? 'Grátis' : formatCurrency(freightValue).replace('R$', '').trim();
  doc.text(freightText, totalsX + totalsWidth - 3, finalY + 5.5, { align: 'right' });
  finalY += 8;
  
  // Total row
  doc.setDrawColor(...black);
  doc.rect(totalsX, finalY, totalsWidth, 10, 'S');
  doc.setTextColor(...black);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...fortlevBlue);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Total Geral:', totalsX + 3, finalY + 7);
  doc.setTextColor(...fortlevRed);
  doc.text(`R$ ${formatCurrency(quotation.total).replace('R$', '').trim()}`, totalsX + totalsWidth - 3, finalY + 7, { align: 'right' });
  finalY += 18;
  
  // Payment conditions
  doc.setTextColor(...fortlevBlue);
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
  doc.setTextColor(...fortlevBlue);
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
  doc.setTextColor(...black);
  doc.text(quotation.companyInfo.sellerRole || 'Gerente de Vendas', 15, finalY);
  finalY += 5;
  doc.text(quotation.companyInfo.name || 'Empresa', 15, finalY);
  
  // Footer bar (Border)
  doc.setDrawColor(...fortlevBlue);
  doc.setFillColor(...fortlevBlue);
  doc.rect(0, doc.internal.pageSize.getHeight() - 10, pageWidth, 10, 'F');
  
  doc.setTextColor(...white);
  doc.setFontSize(7);
  doc.text('Fortlev - Líder em Reservatórios de Água e Tubulações', pageWidth / 2, doc.internal.pageSize.getHeight() - 4, { align: 'center' });
  
  return doc;
};

export const downloadPDF = (quotation: Quotation) => {
  const doc = generatePDF(quotation);
  doc.save(`Orcamento_${quotation.number}_${quotation.customer.name.replace(/\s/g, '_')}.pdf`);
};

export const downloadPNG = async (quotation: Quotation) => {
  // Use html2canvas to capture the exact DOM structure from QuotationPreview
  // We need to wait for the dialog to be open and the element to be present
  const element = document.querySelector('.danfe-container');
  if (!element) {
    console.warn("DANFE container not found for PNG generation, using canvas fallback");
    generateCanvasPNG(quotation);
    return;
  }

  try {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(element as HTMLElement, {
      scale: 2, // Higher quality
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });
    
    const link = document.createElement('a');
    link.download = `DANFE_${quotation.number}_${quotation.customer.name.replace(/\s/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  } catch (error) {
    console.error("Error generating PNG via html2canvas:", error);
    generateCanvasPNG(quotation);
  }
};

const generateCanvasPNG = (quotation: Quotation) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Mobile-optimized dimensions (9:16 aspect ratio for better mobile viewing)
  const baseWidth = 800;
  const padding = 40;
  const contentWidth = baseWidth - (padding * 2);
  
  // Calculate dynamic height based on content
  let estimatedHeight = 400; // Base header + company info
  estimatedHeight += quotation.showClientData && quotation.customer.name ? 180 : 0;
  estimatedHeight += 60 + (quotation.items.length * 50); // Table
  estimatedHeight += 200; // Totals
  estimatedHeight += 280; // Payment + Info + Signature
  estimatedHeight += 60; // Footer
  
  canvas.width = baseWidth;
  canvas.height = Math.max(estimatedHeight, 900);
  
  if (!ctx) return;
  
  // Colors
  const black = '#000000';
  const lightGray = '#f0f0f0';
  const textDark = '#000000';
  
  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'left';
  
  // Title section
  ctx.strokeStyle = black;
  ctx.lineWidth = 1;
  ctx.strokeRect(padding, 10, canvas.width - (padding * 2), 55);
  
  ctx.fillStyle = black;
  ctx.font = 'bold 20px Arial, sans-serif';
  ctx.fillText('DANFE', padding + 10, 38);
  ctx.font = '10px Arial, sans-serif';
  ctx.fillText('DOCUMENTO AUXILIAR DA NOTA FISCAL ELETRÔNICA', padding + 10, 52);
  
  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.textAlign = 'right';
  if ((quotation.branding ?? { showBrand: true }).showBrand) {
    ctx.fillText(quotation.branding?.brandText || 'FORTLEV', canvas.width - padding - 10, 38);
  }
  ctx.textAlign = 'left';
  
  // Company info
  let yPos = 80;
  ctx.fillStyle = textDark;
  ctx.font = '13px Arial, sans-serif';
  
  const rightColX = canvas.width - 200;
  
  if (quotation.companyInfo.name) {
    ctx.fillText(`Emitido por: ${quotation.companyInfo.name}`, padding, yPos);
    ctx.textAlign = 'right';
    ctx.fillText(`Data de Emissão: ${formatDate(quotation.createdAt)}`, canvas.width - padding, yPos);
    ctx.textAlign = 'left';
    yPos += 18;
  }
  
  if (quotation.companyInfo.cnpj) {
    ctx.fillText(`${getBrazilDocumentLabel(quotation.companyInfo.cnpj)}: ${quotation.companyInfo.cnpj}`, padding, yPos);
    ctx.textAlign = 'right';
    ctx.fillText(`Validade: ${quotation.validity}`, canvas.width - padding, yPos);
    ctx.textAlign = 'left';
    yPos += 18;
  }
  
  if (quotation.companyInfo.address) {
    ctx.fillText(`Endereço: ${quotation.companyInfo.address}`, padding, yPos);
    yPos += 18;
  }
  
  if (quotation.companyInfo.phone) {
    ctx.fillText(`Telefone / WhatsApp: ${quotation.companyInfo.phone}`, padding, yPos);
    yPos += 18;
  }
  
  if (quotation.companyInfo.email) {
    ctx.fillText(`E-mail: ${quotation.companyInfo.email}`, padding, yPos);
    yPos += 18;
  }
  
  if (quotation.companyInfo.website) {
    ctx.fillText(`Site: ${quotation.companyInfo.website}`, padding, yPos);
    yPos += 18;
  }
  
  yPos += 8;
  
  // Divider
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, yPos);
  ctx.lineTo(canvas.width - padding, yPos);
  ctx.stroke();
  yPos += 20;
  
  // Quotation number
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.fillText(`Orçamento nº: ${quotation.number}`, padding, yPos);
  ctx.font = '13px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Data de Emissão: ${formatDate(quotation.createdAt)}`, canvas.width / 2 + 50, yPos);
  ctx.textAlign = 'left';
  yPos += 20;
  
  // Divider
  ctx.beginPath();
  ctx.moveTo(padding, yPos);
  ctx.lineTo(canvas.width - padding, yPos);
  ctx.stroke();
  yPos += 20;
  
  // Client section
  if (quotation.showClientData && quotation.customer.name) {
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillText('Cliente:', padding, yPos);
    yPos += 20;
    
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillText(quotation.customer.name, padding, yPos);
    yPos += 18;
    
    ctx.font = '13px Arial, sans-serif';
    if (quotation.customer.cnpj) {
      ctx.fillText(`${getBrazilDocumentLabel(quotation.customer.cnpj)}: ${quotation.customer.cnpj}`, padding, yPos);
      yPos += 18;
    }
    
    if (quotation.customer.address) {
      ctx.fillText(`Endereço de entrega: ${quotation.customer.address}`, padding, yPos);
      yPos += 18;
    }
    
    if (quotation.customer.phone) {
      ctx.fillText(`Telefone / WhatsApp: ${quotation.customer.phone}`, padding, yPos);
      yPos += 18;
    }
    
    yPos += 15;
  }
  
  // Table header
  const tableWidth = contentWidth;
  const colWidths = [tableWidth * 0.45, tableWidth * 0.1, tableWidth * 0.1, tableWidth * 0.18, tableWidth * 0.17];
  const colStarts = [padding];
  for (let i = 1; i < colWidths.length; i++) {
    colStarts.push(colStarts[i-1] + colWidths[i-1]);
  }
  
  ctx.fillStyle = '#000000';
  ctx.fillRect(padding, yPos, tableWidth, 32);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px Arial, sans-serif';
  ctx.fillText('Itens Orçados', colStarts[0] + 8, yPos + 20);
  ctx.fillText('Un.', colStarts[1] + 8, yPos + 20);
  ctx.fillText('Qtd.', colStarts[2] + 8, yPos + 20);
  ctx.fillText('Valor Unit. (R$)', colStarts[3] + 4, yPos + 20);
  ctx.fillText('Total (R$)', colStarts[4] + 4, yPos + 20);
  yPos += 32;
  
  // Table rows
  ctx.font = '11px Arial, sans-serif';
  quotation.items.forEach((item, index) => {
    const rowHeight = 32;
    ctx.fillStyle = index % 2 === 0 ? '#ffffff' : '#fafbfc';
    ctx.fillRect(padding, yPos, tableWidth, rowHeight);
    
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(padding, yPos, tableWidth, rowHeight);
    
    ctx.fillStyle = textDark;
    const itemLabel = item.product.capacity > 0
      ? getProductFullDescription(item.product.type, item.product.capacity, item.product.unit)
      : item.product.name;
    ctx.fillText(itemLabel, colStarts[0] + 8, yPos + 20);
    ctx.fillText('Un.', colStarts[1] + 8, yPos + 20);
    ctx.fillText(item.quantity.toString(), colStarts[2] + 12, yPos + 20);
    ctx.fillText(formatCurrency(item.unitPrice).replace('R$', '').trim(), colStarts[3] + 8, yPos + 20);
    ctx.fillText(formatCurrency(item.subtotal).replace('R$', '').trim(), colStarts[4] + 8, yPos + 20);
    yPos += rowHeight;
  });
  
  yPos += 15;
  
  // Totals - aligned to right
  const totalsWidth = 180;
  const totalsX = canvas.width - padding - totalsWidth;
  
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 1;
  ctx.strokeRect(totalsX, yPos, totalsWidth, 26);
  ctx.fillStyle = textDark;
  ctx.font = '12px Arial, sans-serif';
  ctx.fillText('Subtotal:', totalsX + 10, yPos + 17);
  ctx.textAlign = 'right';
  ctx.fillText(formatCurrency(quotation.subtotal).replace('R$', '').trim(), totalsX + totalsWidth - 10, yPos + 17);
  ctx.textAlign = 'left';
  yPos += 26;
  
  ctx.strokeRect(totalsX, yPos, totalsWidth, 26);
  ctx.fillText('Desconto:', totalsX + 10, yPos + 17);
  ctx.textAlign = 'right';
  ctx.fillText(formatCurrency(quotation.discount).replace('R$', '').trim(), totalsX + totalsWidth - 10, yPos + 17);
  ctx.textAlign = 'left';
  yPos += 26;
  
  // Freight row
  ctx.strokeRect(totalsX, yPos, totalsWidth, 26);
  ctx.fillText('Frete:', totalsX + 10, yPos + 17);
  ctx.textAlign = 'right';
  const freightValue = quotation.freight || 0;
  const freightText = freightValue === 0 ? 'Grátis' : formatCurrency(freightValue).replace('R$', '').trim();
  ctx.fillText(freightText, totalsX + totalsWidth - 10, yPos + 17);
  ctx.textAlign = 'left';
  yPos += 26;
  
  ctx.fillStyle = '#000000';
  ctx.fillRect(totalsX, yPos, totalsWidth, 30);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.fillText('Total Geral:', totalsX + 10, yPos + 20);
  ctx.textAlign = 'right';
  ctx.fillText(`R$ ${formatCurrency(quotation.total).replace('R$', '').trim()}`, totalsX + totalsWidth - 10, yPos + 20);
  ctx.textAlign = 'left';
  yPos += 45;
  
  // Payment conditions
  ctx.fillStyle = textDark;
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.fillText('Condições de Pagamento:', padding, yPos);
  yPos += 20;
  
  ctx.font = '12px Arial, sans-serif';
  if (quotation.paymentConditions.cashDiscount) {
    ctx.fillText(`• À vista: ${quotation.paymentConditions.cashDiscount}`, padding, yPos);
    yPos += 18;
  }
  
  if (quotation.paymentConditions.installments) {
    ctx.fillText(`• Parcelado: ${quotation.paymentConditions.installments}`, padding, yPos);
    yPos += 18;
  }
  
  if (quotation.paymentConditions.downPayment) {
    ctx.fillText(`• Entrada mínima de ${quotation.paymentConditions.downPayment} no fechamento.`, padding, yPos);
    yPos += 18;
  }
  
  yPos += 15;
  
  // Additional info
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.fillText('Informações Adicionais:', padding, yPos);
  yPos += 20;
  
  ctx.font = '12px Arial, sans-serif';
  if (quotation.deliveryTime) {
    ctx.fillText(`• Prazo de entrega: ${quotation.deliveryTime} após confirmação do pagamento.`, padding, yPos);
    yPos += 18;
  }
  
  ctx.fillText('• Instalação realizada por equipe especializada.', padding, yPos);
  yPos += 18;
  ctx.fillText('• Valores sujeitos a alteração sem aviso prévio.', padding, yPos);
  yPos += 18;
  
  if (quotation.observations) {
    // Word wrap for observations
    const maxWidth = contentWidth;
    const words = quotation.observations.split(' ');
    let line = '• ';
    for (const word of words) {
      const testLine = line + word + ' ';
      if (ctx.measureText(testLine).width > maxWidth) {
        ctx.fillText(line, padding, yPos);
        yPos += 18;
        line = word + ' ';
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, padding, yPos);
    yPos += 18;
  }
  
  yPos += 20;
  
  // Signature
  ctx.fillText('Atenciosamente,', padding, yPos);
  yPos += 22;
  
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.fillText(quotation.companyInfo.sellerName || 'Vendedor', padding, yPos);
  yPos += 18;
  
  ctx.font = '12px Arial, sans-serif';
  ctx.fillStyle = '#000000';
  ctx.fillText(quotation.companyInfo.sellerRole || 'Gerente de Vendas', padding, yPos);
  yPos += 18;
  ctx.fillText(quotation.companyInfo.name || 'Empresa', padding, yPos);
  
  // Resize canvas to actual content height
  const finalHeight = yPos + 60;
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = finalHeight;
  const tempCtx = tempCanvas.getContext('2d');
  
  if (tempCtx) {
    tempCtx.drawImage(canvas, 0, 0);
    canvas.height = finalHeight;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tempCanvas, 0, 0);
    
    // Bottom bar
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, finalHeight - 35, canvas.width, 35);
  }
  
  // Download PNG
  const link = document.createElement('a');
  link.download = `Orcamento_${quotation.number}_${quotation.customer.name.replace(/\s/g, '_')}.png`;
  link.href = canvas.toDataURL('image/png', 1.0);
  link.click();
};
