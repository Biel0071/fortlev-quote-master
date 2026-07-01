import type { Quotation } from '@/types/quotation';
import { formatCurrency } from './formatters';
import tableBg from '@/assets/receipt-table-bg.jpg';

/**
 * Renders a thermal-receipt quotation as if photographed on a granite tabletop.
 * Realistic paper: narrow thermal strip, cream tint, subtle fibre texture,
 * serrated top edge, cast shadow, mild rotation and perspective.
 */

const SERRATED_EDGE = `
  <div style="height:10px;background:
    radial-gradient(circle at 6px 10px, transparent 5px, #f4ecdc 5.5px) 0 0/12px 10px repeat-x;
    margin:-14px -22px 8px;"></div>`;

const PAPER_TEXTURE = `
  background-color:#f6efdc;
  background-image:
    linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0) 8%, rgba(0,0,0,0) 92%, rgba(0,0,0,0.06)),
    repeating-linear-gradient(0deg, rgba(0,0,0,0.018) 0 1px, transparent 1px 3px),
    repeating-linear-gradient(90deg, rgba(120,90,30,0.02) 0 2px, transparent 2px 5px),
    radial-gradient(ellipse at 15% 20%, rgba(255,255,255,0.6), transparent 50%),
    radial-gradient(ellipse at 85% 80%, rgba(0,0,0,0.06), transparent 55%);
`;

function buildReceiptHTML(q: Quotation): string {
  const c = q.companyInfo || ({} as any);
  const cust = q.customer || ({} as any);
  const items = q.items || [];
  const dashed = `<div style="border-top:1.2px dashed #1a1a1a;margin:8px -4px;opacity:.85;"></div>`;

  const itemsHTML = items
    .map(
      (it) => `
      <tr>
        <td style="padding:3px 0;text-transform:uppercase;font-weight:700;letter-spacing:.3px;">${(
          it.product?.name || 'Produto'
        ).toString()}</td>
        <td style="padding:3px 6px;text-align:center;">${it.quantity}</td>
        <td style="padding:3px 6px;text-align:right;">${formatCurrency(it.unitPrice).replace('R$', '').trim()}</td>
        <td style="padding:3px 0;text-align:right;font-weight:800;">${formatCurrency(it.subtotal)
          .replace('R$', '')
          .trim()}</td>
      </tr>`
    )
    .join('');

  return `
  <div class="receipt-paper" style="
    position:relative;
    width:360px;
    padding:36px 22px 26px;
    ${PAPER_TEXTURE}
    font-family: 'Courier New', 'Courier', monospace;
    color:#111;
    font-size:12px;
    line-height:1.45;
    box-shadow:
      0 1px 0 rgba(255,255,255,0.9) inset,
      0 30px 40px -12px rgba(0,0,0,0.55),
      0 12px 18px -6px rgba(0,0,0,0.35),
      0 2px 4px rgba(0,0,0,0.25);
    transform: rotate(-2.2deg);
    border-radius:1px;
    filter: contrast(1.02) saturate(0.9);
  ">
    ${SERRATED_EDGE}
    <div style="text-align:center;font-weight:900;font-size:15px;letter-spacing:1px;">
      ${(c.name || 'LOJA').toUpperCase()}
    </div>
    <div style="text-align:center;font-size:10.5px;margin-top:4px;line-height:1.5;">
      ${c.cnpj ? `CNPJ: ${c.cnpj}<br/>` : ''}
      ${c.address ? `${c.address}<br/>` : ''}
      ${c.phone ? `Telefone: ${c.phone}<br/>` : ''}
      ${c.email ? `E-mail: ${c.email}` : ''}
    </div>

    <div style="text-align:center;margin-top:12px;font-size:10.5px;letter-spacing:.5px;">COMPROVANTE DE VENDA</div>
    <div style="text-align:center;font-weight:900;font-size:18px;margin-top:2px;letter-spacing:1px;">Nº: ${q.number}</div>

    ${cust.name || cust.cnpj || cust.phone || cust.address
      ? `<div style="margin-top:10px;font-size:11px;line-height:1.55;">
          ${cust.name ? `<div><b>CLIENTE:</b> ${cust.name.toUpperCase()}</div>` : ''}
          ${cust.cnpj ? `<div><b>CPF/CNPJ:</b> ${cust.cnpj}</div>` : ''}
          ${cust.phone ? `<div><b>TELEFONE:</b> ${cust.phone}</div>` : ''}
          ${cust.address ? `<div><b>ENDEREÇO:</b> ${cust.address}</div>` : ''}
        </div>`
      : ''}

    <div style="margin-top:8px;font-size:10.5px;">${new Date(q.createdAt || Date.now()).toLocaleString('pt-BR')}</div>
    ${dashed}

    <table style="width:100%;border-collapse:collapse;font-size:10.5px;">
      <thead>
        <tr style="font-weight:900;letter-spacing:.5px;">
          <td>DESCRIÇÃO</td>
          <td style="text-align:center;">QNT</td>
          <td style="text-align:right;">UNIT</td>
          <td style="text-align:right;">VALOR</td>
        </tr>
      </thead>
      <tbody>${itemsHTML}</tbody>
    </table>
    ${dashed}

    <table style="width:100%;font-size:11.5px;">
      <tr><td>Itens R$</td><td style="text-align:right;">${formatCurrency(q.subtotal).replace('R$', '').trim()}</td></tr>
      <tr><td>Frete R$</td><td style="text-align:right;">${
        q.freight === 0 ? 'Grátis' : formatCurrency(q.freight).replace('R$', '').trim()
      }</td></tr>
      ${q.discount ? `<tr><td>Desconto R$</td><td style="text-align:right;">${formatCurrency(q.discount).replace('R$', '').trim()}</td></tr>` : ''}
      <tr style="font-weight:900;font-size:14px;">
        <td style="padding-top:4px;">Valor Total R$</td>
        <td style="text-align:right;padding-top:4px;">${formatCurrency(q.total).replace('R$', '').trim()}</td>
      </tr>
    </table>

    <div style="margin-top:8px;font-weight:900;font-size:11.5px;">
      FORMA DE PGTO.: ${q.paymentConditions?.cashDiscount ? 'À VISTA' : 'A COMBINAR'}
    </div>
    ${c.sellerName ? `<div style="margin-top:6px;font-size:11px;"><b>VENDEDOR(A):</b> ${c.sellerName.toUpperCase()}</div>` : ''}

    ${q.observations ? `${dashed}<div style="font-size:10.5px;line-height:1.5;">${q.observations}</div>` : ''}
    ${dashed}

    <div style="text-align:center;font-size:10.5px;margin-top:22px;">ASSINATURA DO CLIENTE</div>
    <div style="border-top:1px solid #111;margin:26px 30px 8px;"></div>
    ${dashed}
    <div style="text-align:center;font-weight:900;font-size:12px;letter-spacing:.8px;">OBRIGADO E VOLTE SEMPRE!</div>

    <!-- subtle glare + curl shadow -->
    <div style="pointer-events:none;position:absolute;inset:0;background:
      linear-gradient(115deg, rgba(255,255,255,0.35), rgba(255,255,255,0) 25%),
      linear-gradient(295deg, rgba(0,0,0,0.08), rgba(0,0,0,0) 30%);"></div>
  </div>`;
}

async function renderCanvas(q: Quotation): Promise<HTMLCanvasElement> {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    position:fixed;left:-9999px;top:0;
    width:820px;height:1160px;
    padding:70px 60px;
    box-sizing:border-box;
    display:flex;align-items:center;justify-content:center;
    background-image:
      radial-gradient(ellipse at center, rgba(0,0,0,0.05), rgba(0,0,0,0.35) 90%),
      url(${tableBg});
    background-size:cover, cover;
    background-position:center, center;
  `;
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
