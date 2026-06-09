import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Quotation } from '@/types/quotation';
import { formatCurrency, formatDate, getBrazilDocumentLabel } from './formatters';
import { getProductFullDescription } from './taxCalculator';

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0];
};

type RGB = [number, number, number];

export const generatePDF = (quotation: Quotation, config?: any): jsPDF => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  const branding = quotation.branding ?? {
    showBrand: true,
    brandText: 'FORTLEV',
  };
  
  // Colors
  const black: RGB = [0, 0, 0];
  const white: RGB = [255, 255, 255];
  const fortlevBlue: RGB = config?.primaryColor ? hexToRgb(config.primaryColor) : [0, 74, 151];
  const fortlevRed: RGB = config?.secondaryColor ? hexToRgb(config.secondaryColor) : [231, 18, 18];
  const textDark: RGB = [30, 30, 30];
  
  // Header bar (Fortlev Blue)
  doc.setDrawColor(...fortlevBlue);
  doc.setFillColor(...fortlevBlue);
  doc.rect(0, 0, pageWidth, 12, 'F');
  
  // Title section
  doc.setTextColor(...white);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(config?.headerText || 'ORÇAMENTO DE PRODUTOS', pageWidth / 2, 8, { align: 'center' });

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
  const tableData = (quotation.items || []).map((item) => {
    const label = item.product?.capacity > 0
      ? getProductFullDescription(item.product.type, item.product.capacity, item.product.unit)
      : (item.product?.name || 'Produto');

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
  doc.text(config?.footerText || 'Fortlev - Líder em Reservatórios de Água e Tubulações', pageWidth / 2, doc.internal.pageSize.getHeight() - 4, { align: 'center' });
  
  return doc;
};

export const downloadPDF = (quotation: Quotation) => {
  const doc = generatePDF(quotation);
  doc.save(`orcamento-${quotation.number}.pdf`);
};

export const downloadPNG = async (quotation: Quotation) => {
  const toast = (await import('@/hooks/use-toast')).toast;
  
  try {
    // Look for the commercial budget layout in the DOM
    let element = document.querySelector('.quotation-card') as HTMLElement;
    let removeAfter = false;
    let container: HTMLDivElement | null = null;

    // If not found (e.g., we are in the dashboard list), we need to render it temporarily
    if (!element) {
      container = document.createElement('div');
      container.id = 'temp-quotation-render';
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '800px';
      container.style.backgroundColor = 'white';
      document.body.appendChild(container);

      // We use a simplified version of the budget layout for PNG if the main one isn't visible
      // In a real app, you'd probably use a dedicated component for this
      container.innerHTML = `
        <div class="quotation-card p-8 font-sans" style="width: 800px; min-height: 1000px; color: #1e1e1e;">
          <div style="background-color: #004a97; height: 12px; margin: -32px -32px 32px -32px;"></div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
            <div style="border: 2px solid #004a97; padding: 15px; width: 200px; text-align: center;">
              <h2 style="color: #004a97; font-size: 24px; font-weight: bold; margin: 0;">${quotation.branding?.brandText || 'FORTLEV'}</h2>
              <p style="font-size: 8px; color: #004a97; margin-top: 4px;">QUALIDADE EM PRIMEIRO LUGAR</p>
            </div>
            <div style="background-color: #f5f7fa; border: 1px solid #004a97; padding: 15px; width: 250px; text-align: center;">
              <p style="color: #004a97; font-size: 14px; font-weight: bold; margin-bottom: 5px;">Orçamento: ${quotation.number}</p>
              <p style="color: #e71212; font-size: 11px; margin-bottom: 3px;">Válido até: ${quotation.validity}</p>
              <p style="color: #1e1e1e; font-size: 10px;">Emissão: ${formatDate(quotation.createdAt)}</p>
            </div>
          </div>
          
          <div style="margin-bottom: 30px;">
            <h3 style="color: #004a97; font-size: 14px; font-weight: bold; border-bottom: 1px solid #004a97; padding-bottom: 5px; margin-bottom: 10px;">DADOS DO EMISSOR</h3>
            <p style="font-size: 12px; font-weight: bold; margin-bottom: 5px;">${quotation.companyInfo.name}</p>
            <p style="font-size: 11px;">CNPJ: ${quotation.companyInfo.cnpj} | Fone: ${quotation.companyInfo.phone}</p>
            <p style="font-size: 11px;">Endereço: ${quotation.companyInfo.address}</p>
          </div>

          <div style="margin-bottom: 30px;">
            <h3 style="color: #004a97; font-size: 14px; font-weight: bold; border-bottom: 1px solid #004a97; padding-bottom: 5px; margin-bottom: 10px;">DADOS DO CLIENTE</h3>
            <p style="font-size: 12px; font-weight: bold; margin-bottom: 5px;">${quotation.customer.name}</p>
            <p style="font-size: 11px;">CNPJ/CPF: ${quotation.customer.cnpj} | Fone: ${quotation.customer.phone}</p>
            <p style="font-size: 11px;">Entrega: ${quotation.customer.address}</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
              <tr style="background-color: #004a97; color: white; font-size: 10px;">
                <th style="padding: 10px; text-align: left;">DESCRIÇÃO</th>
                <th style="padding: 10px; text-align: center; width: 50px;">QTD</th>
                <th style="padding: 10px; text-align: right; width: 100px;">VLR. UNIT</th>
                <th style="padding: 10px; text-align: right; width: 100px;">VLR. TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${(quotation.items || []).map(item => `
                <tr style="border-bottom: 1px solid #eee; font-size: 10px;">
                  <td style="padding: 10px;">${item.product?.name || 'Produto'} ${item.product?.capacity > 0 ? item.product.capacity + item.product.unit : ''}</td>
                  <td style="padding: 10px; text-align: center;">${item.quantity || 0}</td>
                  <td style="padding: 10px; text-align: right;">${formatCurrency(item.unitPrice || 0).replace('R$', '').trim()}</td>
                  <td style="padding: 10px; text-align: right; font-weight: bold;">${formatCurrency(item.subtotal || 0).replace('R$', '').trim()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="display: flex; justify-content: flex-end; margin-bottom: 40px;">
            <div style="width: 250px; border: 1px solid #004a97; padding: 15px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px;">
                <span>Subtotal:</span>
                <span>${formatCurrency(quotation.subtotal)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px;">
                <span>Desconto:</span>
                <span>${formatCurrency(quotation.discount)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
                <span>Frete:</span>
                <span>${quotation.freight === 0 ? 'Grátis' : formatCurrency(quotation.freight)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; color: #004a97;">
                <span>TOTAL:</span>
                <span style="color: #e71212;">${formatCurrency(quotation.total)}</span>
              </div>
            </div>
          </div>

          <div style="background-color: #004a97; height: 10px; margin: 32px -32px -32px -32px;"></div>
        </div>
      `;
      element = container.firstElementChild as HTMLElement;
      removeAfter = true;
    }

    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: element.offsetWidth,
      height: element.offsetHeight,
    });
    
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 1.0));
    
    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `orcamento-${quotation.number}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    
    if (removeAfter && container) {
      document.body.removeChild(container);
    }
    
    return true;
  } catch (error) {
    console.error("Error generating PNG:", error);
    throw error;
  }
};



