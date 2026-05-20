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
  // Try to find the Quotation element first (Commercial Blue Template)
  // If we are in the Preview modal, it shows the DANFE, but the user wants PNG of the BUDGET.
  // We'll create a hidden div with the budget style to capture it if it's not visible.
  
  const toast = (await import('@/hooks/use-toast')).toast;
  
  toast({
    title: "Gerando imagem...",
    description: "Preparando o arquivo PNG do orçamento.",
  });

  // Create a temporary container for the commercial budget layout
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px';
  container.style.backgroundColor = 'white';
  document.body.appendChild(container);

  try {
    const { renderToString } = await import('react-dom/server');
    // Note: Since we can't easily render the full React component tree to string with all styles here,
    // and html2canvas needs a real DOM element, we'll use a simplified version of the commercial layout
    // OR we rely on the fact that the PDF generator already has the logic.
    // However, the best way to get a PNG that MATCHES the PDF exactly is to use the PDF and convert it,
    // but that's complex.
    
    // Instead, let's look for the .quotation-card or similar if it exists in the main view.
    // For now, let's keep the html2canvas logic but ensure it targets the right thing.
    
    const element = document.querySelector('.quotation-card') || document.querySelector('.danfe-container');
    
    if (!element) {
      document.body.removeChild(container);
      console.warn("No element found for PNG generation");
      return;
    }

    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(element as HTMLElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });
    
    const link = document.createElement('a');
    link.download = `Orcamento_${quotation.number}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
    
    document.body.removeChild(container);
  } catch (error) {
    console.error("Error generating PNG:", error);
    if (document.body.contains(container)) document.body.removeChild(container);
  }
};


