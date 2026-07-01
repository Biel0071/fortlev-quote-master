import type { Quotation } from '@/types/quotation';
import { formatCurrency } from './formatters';
import tableBg from '@/assets/receipt-table-real-bg.jpg';

/**
 * Renders a printed quotation as a clean top-down photo on a real countertop.
 * The background comes from a real uploaded table photo; the paper stays straight,
 * flat, white and crisp so the result looks like a real store quotation photo.
 */

function buildReceiptHTML(q: Quotation): string {
  const c = q.companyInfo || ({} as any);
  const cust = q.customer || ({} as any);
  const items = q.items || [];
  const rule = `<div style="border-top:1px solid #111;margin:10px 0;opacity:.85;"></div>`;
  const dashed = `<div style="border-top:1px dashed #222;margin:8px 0;opacity:.75;"></div>`;

  const itemsHTML = items
    .map(
      (it) => `
      <tr>
        <td style="padding:4px 0;vertical-align:top;">
          <div style="font-weight:700;">${(it.product?.name || 'Produto').toString()}</div>
        </td>
        <td style="padding:4px 6px;text-align:center;vertical-align:top;">${it.quantity}</td>
        <td style="padding:4px 6px;text-align:right;vertical-align:top;">${formatCurrency(it.unitPrice)}</td>
        <td style="padding:4px 0;text-align:right;vertical-align:top;font-weight:700;">${formatCurrency(it.subtotal)}</td>
      </tr>`
    )
    .join('');

  return `
  <div class="paper" style="
    position:relative;
    width:520px;
    min-height:735px;
    box-sizing:border-box;
    padding:56px 48px 48px;
    background:#ffffff;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    color:#000000;
    font-size:12.5px;
    line-height:1.5;
    box-shadow: 0 14px 22px -14px rgba(0,0,0,0.35);
    border-radius:0;
  ">

    <div style="text-align:center;">
      <div style="font-size:20px;font-weight:900;letter-spacing:1.5px;">${(c.name || 'LOJA').toUpperCase()}</div>
      <div style="font-size:11px;margin-top:6px;line-height:1.55;color:#222;">
        ${c.cnpj ? `CNPJ: ${c.cnpj}<br/>` : ''}
        ${c.address ? `${c.address}<br/>` : ''}
        ${c.phone ? `Telefone: ${c.phone}${c.email ? ' &nbsp;•&nbsp; ' + c.email : ''}` : c.email || ''}
      </div>
    </div>

    ${rule}

    <div style="display:flex;justify-content:space-between;align-items:baseline;">
      <div style="font-size:11.5px;letter-spacing:.5px;color:#333;">ORÇAMENTO</div>
      <div style="font-size:16px;font-weight:900;">Nº ${q.number}</div>
    </div>
    <div style="font-size:11px;color:#333;margin-top:2px;">
      ${new Date(q.createdAt || Date.now()).toLocaleString('pt-BR')}
    </div>

    ${cust.name || cust.cnpj || cust.phone || cust.address
      ? `${dashed}
         <div style="font-size:11.5px;line-height:1.6;">
           ${cust.name ? `<div><b>Cliente:</b> ${cust.name}</div>` : ''}
           ${cust.cnpj ? `<div><b>CPF/CNPJ:</b> ${cust.cnpj}</div>` : ''}
           ${cust.phone ? `<div><b>Telefone:</b> ${cust.phone}</div>` : ''}
           ${cust.address ? `<div><b>Endereço:</b> ${cust.address}</div>` : ''}
         </div>`
      : ''}

    ${rule}

    <table style="width:100%;border-collapse:collapse;font-size:11.5px;">
      <thead>
        <tr style="border-bottom:1px solid #111;">
          <td style="padding-bottom:4px;font-weight:800;">Descrição</td>
          <td style="padding-bottom:4px;text-align:center;font-weight:800;">Qtd</td>
          <td style="padding-bottom:4px;text-align:right;font-weight:800;">Unit.</td>
          <td style="padding-bottom:4px;text-align:right;font-weight:800;">Total</td>
        </tr>
      </thead>
      <tbody>${itemsHTML}</tbody>
    </table>

    ${rule}

    <table style="width:100%;font-size:12px;">
      <tr><td>Subtotal</td><td style="text-align:right;">${formatCurrency(q.subtotal)}</td></tr>
      <tr><td>Frete</td><td style="text-align:right;">${q.freight === 0 ? 'Grátis' : formatCurrency(q.freight)}</td></tr>
      ${q.discount ? `<tr><td>Desconto</td><td style="text-align:right;">- ${formatCurrency(q.discount)}</td></tr>` : ''}
      <tr style="font-weight:900;font-size:15px;">
        <td style="padding-top:6px;border-top:1px solid #111;">TOTAL</td>
        <td style="padding-top:6px;border-top:1px solid #111;text-align:right;">${formatCurrency(q.total)}</td>
      </tr>
    </table>

    <div style="margin-top:10px;font-size:11.5px;">
      <b>Forma de pagamento:</b> ${q.paymentConditions?.cashDiscount ? 'À vista' : 'A combinar'}
    </div>
    ${c.sellerName ? `<div style="font-size:11.5px;margin-top:2px;"><b>Vendedor(a):</b> ${c.sellerName}</div>` : ''}
    ${q.validity ? `<div style="font-size:11.5px;margin-top:2px;"><b>Validade:</b> ${q.validity}</div>` : ''}

    ${q.observations
      ? `${dashed}<div style="font-size:11px;line-height:1.55;color:#222;">${q.observations}</div>`
      : ''}

    <div style="margin-top:26px;text-align:center;font-size:11px;color:#333;">Assinatura do cliente</div>
    <div style="border-top:1px solid #111;margin:22px 60px 6px;"></div>

    <div style="margin-top:14px;text-align:center;font-size:10.5px;letter-spacing:.4px;color:#333;">
      Obrigado pela preferência!
    </div>
  </div>`;
}

async function renderCanvas(q: Quotation): Promise<HTMLCanvasElement> {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    position:fixed;left:-9999px;top:0;
    width:900px;height:1200px;
    padding:0;
    box-sizing:border-box;
    display:flex;align-items:center;justify-content:center;
    background-image:url(${tableBg});
    background-size:cover;
    background-position:center;
  `;

  const stage = document.createElement('div');
  stage.style.cssText = `
    transform: rotate(-1.6deg);
    transform-origin:center;
  `;
  stage.innerHTML = buildReceiptHTML(q);
  wrapper.appendChild(stage);
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
  a.download = `orcamento-${q.number}.jpg`;
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
