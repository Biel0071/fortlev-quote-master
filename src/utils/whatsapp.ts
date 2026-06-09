import { Quotation } from '@/types/quotation';
import { formatCurrency, formatDate, cleanPhone } from './formatters';

export const generateWhatsAppMessage = (quotation: Quotation): string => {
  const itemsList = (quotation.items || [])
    .map(item => `• ${item.product?.capacity || 0}${item.product?.unit || ''} - Qtd: ${item.quantity || 0} - ${formatCurrency(item.subtotal || 0)}`)
    .join('\n');

  const branding = quotation.branding ?? { showBrand: true, brandText: 'FORTLEV' };
  const headerTitle = branding.showBrand
    ? `ORÇAMENTO ${branding.brandText || 'FORTLEV'}`
    : 'ORÇAMENTO';

  const message = `
🔵 *${headerTitle}* 🔵
━━━━━━━━━━━━━━━━━━

📋 *Nº ${quotation.number}*
📅 Data: ${formatDate(quotation.createdAt)}
⏰ Validade: ${quotation.validity}

👤 *Cliente:* ${quotation.customer.name}
📍 *Endereço:* ${quotation.customer.address}

━━━━━━━━━━━━━━━━━━
📦 *ITENS DO ORÇAMENTO:*
━━━━━━━━━━━━━━━━━━

${itemsList}

━━━━━━━━━━━━━━━━━━
💰 *TOTAL: ${formatCurrency(quotation.total)}*
━━━━━━━━━━━━━━━━━━

${quotation.observations ? `📝 *Observações:* ${quotation.observations}\n\n` : ''}
✅ Aguardamos sua confirmação!
📞 Entre em contato para mais informações.

_Orçamento gerado pelo sistema_
  `.trim();

  return message;
};

export const openWhatsApp = (quotation: Quotation) => {
  const phone = cleanPhone(quotation.customer.phone);
  const message = encodeURIComponent(generateWhatsAppMessage(quotation));
  const url = `https://api.whatsapp.com/send?phone=55${phone}&text=${message}`;
  window.open(url, '_blank');
};
