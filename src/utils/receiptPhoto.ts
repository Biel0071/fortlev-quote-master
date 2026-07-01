import type { Quotation } from '@/types/quotation';
import { formatCurrency } from './formatters';
import tableBg from '@/assets/receipt-table-bg.jpg';

/**
 * Renders a thermal-receipt quotation on a granite tabletop background
 * so it looks like a photo of a printed ticket lying on a table.
 * Used for both PNG download and PDF (image page).
 */
function buildReceiptHTML(q: Quotation): string {
  const c = q.companyInfo || ({} as any);
  const cust = q.customer || ({} as any);
  const items = q.items || [];
  const dash = `<div style="border-top:1px dashed #000;margin:6px 0;"></div>`;
  const itemsHTML = items
    .map(
      (it) => `
      <tr>
        <td style="padding:2px 0;text-transform:uppercase;">${(it.product?.name || 'Produto').toString()}</td>
        <td style="padding:2px 4px;text-align:center;">${it.quantity}</td>
        <td style="padding:2px 4px;text-align:right;">${formatCurrency(it.unitPrice).replace('R$', '').trim()}</td>
        <td style="padding:2px 0;text-align:right;font-weight:600;">${formatCurrency(it.subtotal).replace('R$', '').trim()}</td>
      </tr>`
    )
    .join('');

  return `
  <div style="width:520px;background:#fafaf7;padding:26px 22px;font-family:'Courier New',monospace;color:#111;font-size:13px;line-height:1.35;box-shadow:0 22px 40px rgba(0,0,0,0.35),0 8px 12px rgba(0,0,0,0.25);transform:rotate(-1.4deg);border-radius:2px;background-image:linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0) 40%),radial-gradient(ellipse at 20% 10%,rgba(0,0,0,0.05),transparent 60%);">
    <div style="text-align:center;font-weight:800;font-size:16px;letter-spacing:.5px;">${(c.name || 'LOJA').toUpperCase()}</div>
    <div style="text-align:center;font-size:11px;margin-top:4px;">
      ${c.cnpj ? `CNPJ: ${c.cnpj}<br/>` : ''}
      ${c.address ? `${c.address}<br/>` : ''}
      ${c.phone ? `Telefone: ${c.phone}<br/>` : ''}
      ${c.email ? `E-mail: ${c.email}` : ''}
    </div>
    <div style="text-align:center;margin-top:10px;font-size:11px;">COMPROVANTE DE VENDA</div>
    <div style="text-align:center;font-weight:800;font-size:18px;margin-top:2px;">Nº: ${q.number}</div>
    <div style="margin-top:10px;font-size:12px;">
      ${cust.name ? `CLIENTE: ${cust.name.toUpperCase()}<br/>` : ''}
      ${cust.cnpj ? `CPF/CNPJ: ${cust.cnpj}<br/>` : ''}
      ${cust.phone ? `TELEFONE: ${cust.phone}<br/>` : ''}
      ${cust.address ? `ENDEREÇO: ${cust.address}` : ''}
    </div>
    <div style="margin-top:8px;font-size:11px;">${new Date(q.createdAt || Date.now()).toLocaleString('pt-BR')}</div>
    ${dash}
    <table style="width:100%;border-collapse:collapse;font-size:11px;">
      <thead>
        <tr style="font-weight:700;">
          <td>DESCRIÇÃO</td>
          <td style="text-align:center;">QNT</td>
          <td style="text-align:right;">UNIT</td>
          <td style="text-align:right;">VALOR</td>
        </tr>
      </thead>
      <tbody>${itemsHTML}</tbody>
    </table>
    ${dash}
    <table style="width:100%;font-size:12px;">
      <tr><td>Itens R$</td><td style="text-align:right;">${formatCurrency(q.subtotal).replace('R$', '').trim()}</td></tr>
      <tr><td>Frete R$</td><td style="text-align:right;">${q.freight === 0 ? 'Grátis' : formatCurrency(q.freight).replace('R$', '').trim()}</td></tr>
      ${q.discount ? `<tr><td>Desconto R$</td><td style="text-align:right;">${formatCurrency(q.discount).replace('R$', '').trim()}</td></tr>` : ''}
      <tr style="font-weight:800;font-size:14px;"><td>Valor Total R$</td><td style="text-align:right;">${formatCurrency(q.total).replace('R$', '').trim()}</td></tr>
    </table>
    <div style="margin-top:6px;font-weight:700;font-size:12px;">FORMA DE PGTO.: ${q.paymentConditions?.cashDiscount ? 'À VISTA' : 'A COMBINAR'}</div>
    ${c.sellerName ? `<div style="margin-top:6px;font-size:12px;">VENDEDOR(A): ${c.sellerName.toUpperCase()}</div>` : ''}
    ${q.observations ? `${dash}<div style="font-size:11px;">${q.observations}</div>` : ''}
    ${dash}
    <div style="text-align:center;font-size:11px;margin-top:14px;">ASSINATURA DO CLIENTE</div>
    <div style="border-top:1px solid #000;margin:26px 40px 6px;"></div>
    ${dash}
    <div style="text-align:center;font-weight:800;font-size:12px;">OBRIGADO E VOLTE SEMPRE!</div>
  </div>`;
}

async function renderCanvas(q: Quotation): Promise<HTMLCanvasElement> {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `position:fixed;left:-9999px;top:0;width:900px;height:1200px;padding:60px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;background-image:url(${tableBg});background-size:cover;background-position:center;`;
  wrapper.innerHTML = buildReceiptHTML(q);
  document.body.appendChild(wrapper);

  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(wrapper, {
    scale: 2,
    useCORS: true,
    backgroundColor: null,
    logging: false,
    width: wrapper.offsetWidth,
    height: wrapper.offsetHeight,
  });
  document.body.removeChild(wrapper);
  return canvas;
}

export async function downloadReceiptPhotoPNG(q: Quotation): Promise<void> {
  const canvas = await renderCanvas(q);
  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95));
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `orcamento-${q.number}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadReceiptPhotoPDF(q: Quotation): Promise<void> {
  const canvas = await renderCanvas(q);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const { default: jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const ratio = canvas.width / canvas.height;
  let w = pageW - 20;
  let h = w / ratio;
  if (h > pageH - 20) {
    h = pageH - 20;
    w = h * ratio;
  }
  pdf.addImage(dataUrl, 'JPEG', (pageW - w) / 2, (pageH - h) / 2, w, h);
  pdf.save(`orcamento-${q.number}.pdf`);
}
