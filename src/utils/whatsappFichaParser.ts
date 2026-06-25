// Parser local de fichas estruturadas coladas do WhatsApp.
// Detecta blocos como "DADOS DO CLIENTE", "ENDEREÇO", "CAIXA", "ITENS", etc.
// Retorna null quando o texto não parece uma ficha estruturada — nesse caso
// o chamador deve seguir com a análise por IA.

export interface ParsedFichaCustomer {
  name?: string;
  phone?: string;
  email?: string;
  cpf_cnpj?: string;
  address?: string;
  city?: string;
  state?: string;
  cep?: string;
}

export interface ParsedFichaItem {
  originalText: string;
  productName: string;
  quantity: number;
  unit: string;
}

export interface ParsedFicha {
  customer: ParsedFichaCustomer;
  items: ParsedFichaItem[];
  observations?: string;
}

const SECTION_HINTS = [
  /dados\s+do\s+cliente/i,
  /endere[çc]o/i,
  /caixa\s+d['']?\s*[aá]gua/i,
  /itens?/i,
  /pedido/i,
  /produtos?/i,
];

const FIELD_PATTERNS: Array<[keyof ParsedFichaCustomer, RegExp]> = [
  ["name", /(?:^|\n)\s*(?:nome|cliente)\s*[:\-]\s*(.+)/i],
  ["phone", /(?:^|\n)\s*(?:telefone|fone|celular|whats(?:app)?)\s*[:\-]\s*(.+)/i],
  ["email", /(?:^|\n)\s*e-?mail\s*[:\-]\s*(\S+@\S+)/i],
  ["cpf_cnpj", /(?:^|\n)\s*(?:cpf|cnpj|documento)\s*[:\-]\s*([\d./\- ]{11,18})/i],
  ["address", /(?:^|\n)\s*(?:endere[çc]o|rua|av(?:enida)?)\s*[:\-]\s*(.+)/i],
  ["city", /(?:^|\n)\s*cidade\s*[:\-]\s*(.+)/i],
  ["state", /(?:^|\n)\s*(?:estado|uf)\s*[:\-]\s*(.+)/i],
  ["cep", /(?:^|\n)\s*cep\s*[:\-]\s*([\d\-\.]{8,10})/i],
];

const ITEM_LINE = /^\s*(?:[-•*]\s*)?(\d+)\s*(?:x|un|unid|unidade|cx|caixas?|pe[çc]as?|pcs?|metros?|m|kg|sc|sacos?)?\s*[-x]?\s*(.+)/i;

export function parseWhatsappFicha(raw: string): ParsedFicha | null {
  if (!raw || raw.trim().length < 20) return null;

  const text = raw.replace(/\r/g, "");
  const hits = SECTION_HINTS.reduce((n, rx) => n + (rx.test(text) ? 1 : 0), 0);
  const hasField = FIELD_PATTERNS.some(([, rx]) => rx.test(text));
  if (hits < 1 && !hasField) return null;

  const customer: ParsedFichaCustomer = {};
  for (const [key, rx] of FIELD_PATTERNS) {
    const m = text.match(rx);
    if (m) customer[key] = m[1].trim().replace(/\s+/g, " ");
  }

  // UF a partir do estado, se vier por extenso
  if (customer.state && customer.state.length > 2) {
    const ufMatch = customer.state.match(/\b([A-Z]{2})\b/);
    if (ufMatch) customer.state = ufMatch[1];
  }

  // Items: linhas que começam com número + descrição
  const items: ParsedFichaItem[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 4) continue;
    if (FIELD_PATTERNS.some(([, rx]) => rx.test(trimmed))) continue;
    const m = trimmed.match(ITEM_LINE);
    if (!m) continue;
    const qty = parseInt(m[1], 10);
    const desc = m[2].trim();
    if (!Number.isFinite(qty) || qty <= 0 || qty > 9999) continue;
    if (desc.length < 3) continue;
    // Evitar capturar CEP/CPF como item
    if (/^\d[\d.\-\/ ]{6,}$/.test(desc)) continue;
    const unitMatch = trimmed.match(/\b(un|unid|unidade|cx|caixas?|pe[çc]as?|pcs?|metros?|kg|sc|sacos?|m)\b/i);
    items.push({
      originalText: trimmed,
      productName: desc,
      quantity: qty,
      unit: unitMatch ? unitMatch[1].toLowerCase().replace(/s$/, "") : "un",
    });
  }

  const obsMatch = text.match(/(?:observa[çc][õo]es?|obs)\s*[:\-]\s*([\s\S]+?)(?:\n\n|$)/i);

  if (Object.keys(customer).length === 0 && items.length === 0) return null;

  return {
    customer,
    items,
    observations: obsMatch ? obsMatch[1].trim() : undefined,
  };
}
