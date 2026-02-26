// Centralized standard product description generator (markdown)
import { detectMaterial, detectWarrantyByProduct } from "@/utils/productIntelligence";

export type StandardDescriptionInput = {
  id?: string | null;
  name: string;
  categoryName?: string | null;
  sku?: string | null;
  unit?: string | null;
};

function norm(s: string | null | undefined) {
  return String(s ?? "").trim();
}

function pickTypeText(category: string, name: string) {
  const hay = `${category} ${name}`.toLowerCase();

  if (hay.includes("cimento")) {
    return {
      application: "indicada para preparo de argamassas e concretos em obras residenciais e comerciais",
      benefits: "boa trabalhabilidade, desempenho consistente e acabamento uniforme",
      usage: "ideal para assentamento, reboco, contrapisos e pequenas estruturas conforme traço recomendado",
      diff: "padronização do produto e facilidade de mistura para reduzir retrabalho",
      applicationLabel: "Estrutural / Argamassas",
    };
  }

  if (hay.includes("tijolo") || hay.includes("bloco")) {
    return {
      application: "voltada para alvenaria de vedação e/ou estrutural, conforme especificação do modelo",
      benefits: "bom rendimento, alinhamento facilitado e ganho de produtividade na execução",
      usage: "recomendado para paredes internas e externas, com assentamento e prumo adequados",
      diff: "geometria regular e resistência compatível com aplicações em obra",
      applicationLabel: "Alvenaria",
    };
  }

  if (hay.includes("caixa") && (hay.includes("água") || hay.includes("agua"))) {
    return {
      application: "projetada para armazenamento de água potável em instalações residenciais, comerciais e rurais",
      benefits: "reserva segura, proteção do conteúdo e melhor estabilidade do abastecimento",
      usage: "instalação em base nivelada, com conexões compatíveis e limpeza periódica",
      diff: "alta durabilidade e compatibilidade com uso hidráulico contínuo",
      applicationLabel: "Hidráulica / Reservatório",
    };
  }

  if (hay.includes("areia") || hay.includes("brita")) {
    return {
      application: "utilizada como agregado em argamassas e concretos",
      benefits: "melhora a coesão da mistura e contribui para acabamento uniforme",
      usage: "indicada para assentamento, reboco e preparo de concreto conforme especificação",
      diff: "granulometria adequada para aplicações comuns de obra",
      applicationLabel: "Argamassa / Concreto",
    };
  }

  if (hay.includes("ferragem") || hay.includes("vergalh") || hay.includes("aço") || hay.includes("aco")) {
    return {
      application: "destinada a reforço estrutural em concreto armado",
      benefits: "aumenta a capacidade de carga e a segurança da estrutura",
      usage: "utilização conforme projeto estrutural, com amarração e cobrimento corretos",
      diff: "padronização dimensional e desempenho compatível com aplicações estruturais",
      applicationLabel: "Estrutural",
    };
  }

  return {
    application: "indicada para aplicações gerais em obra, manutenção e instalações",
    benefits: "facilita a execução, melhora o acabamento e aumenta a eficiência do serviço",
    usage: "recomendado seguir boas práticas de instalação e as orientações do fabricante",
    diff: "solução prática com boa relação custo-benefício para o dia a dia da obra",
    applicationLabel: "Uso geral",
  };
}

export function generateStandardProductDescription(seed: StandardDescriptionInput): string {
  const name = norm(seed.name);
  const categoryName = norm(seed.categoryName);
  const sku = norm(seed.sku);
  const unit = norm(seed.unit);

  const t = pickTypeText(categoryName, name);

  const brand = "-";
  const model = name || "-";
  const category = categoryName || "-";
  const unitOut = unit || "-";
  const skuOut = sku || "-";
  const application = t.applicationLabel || "-";

  const material = detectMaterial(name) || "-";
  const warranty = detectWarrantyByProduct(name, categoryName) || "-";

  return [
    "## Descrição Geral",
    "",
    `${name || "Este produto"} é uma solução ${t.application}, oferecendo ${t.benefits}. ` +
      `É recomendado para ${t.usage}, com foco em ${t.diff}.`,
    "",
    "## Ficha Técnica",
    "",
    `Marca: ${brand}`,
    `Modelo: ${model}`,
    `Categoria: ${category}`,
    `Unidade: ${unitOut}`,
    `SKU: ${skuOut}`,
    `Aplicação: ${application}`,
    `Material: ${material}`,
    `Garantia: ${warranty}`,
  ].join("\n");
}
