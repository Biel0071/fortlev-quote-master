import type { ConstructionProduct } from '@/types/construction';

/** Desconto aplicado sobre o preço médio de mercado. */
export const MARKET_DISCOUNT = 0.2;
const d = (market: number) => Math.round(market * (1 - MARKET_DISCOUNT) * 100) / 100;

type Row = [id: string, name: string, unit: ConstructionProduct['unit'], price: number];

// Preços fixos informados pela loja
const fixed: Row[] = [
  ['vara-cano-100mm', 'Vara de Cano 100mm', 'br', 52.6],
  ['vara-cano-50mm', 'Vara de Cano 50mm', 'br', 35.22],
  ['joelho-100mm', 'Joelho 100mm', 'pç', 8.5],
];

// [id, nome, unidade, preço médio de mercado] -> preço final = mercado - 20%
const market: Row[] = [
  // Varas / canos de esgoto 6m
  ['vara-cano-40mm', 'Vara de Cano Esgoto 40mm 6m', 'br', 29.9],
  ['vara-cano-75mm', 'Vara de Cano Esgoto 75mm 6m', 'br', 64.9],
  ['vara-cano-150mm', 'Vara de Cano Esgoto 150mm 6m', 'br', 189.9],
  // Canos soldáveis água fria 6m
  ['cano-soldavel-20mm', 'Cano Soldável Água Fria 20mm 6m', 'br', 22.9],
  ['cano-soldavel-25mm', 'Cano Soldável Água Fria 25mm 6m', 'br', 29.9],
  ['cano-soldavel-32mm', 'Cano Soldável Água Fria 32mm 6m', 'br', 54.9],
  ['cano-soldavel-40mm', 'Cano Soldável Água Fria 40mm 6m', 'br', 79.9],
  ['cano-soldavel-50mm', 'Cano Soldável Água Fria 50mm 6m', 'br', 99.9],
  ['cano-soldavel-60mm', 'Cano Soldável Água Fria 60mm 6m', 'br', 159.9],
  // CPVC água quente 3m
  ['cano-cpvc-15mm', 'Cano CPVC Água Quente 15mm 3m', 'br', 34.9],
  ['cano-cpvc-22mm', 'Cano CPVC Água Quente 22mm 3m', 'br', 54.9],
  ['cano-cpvc-28mm', 'Cano CPVC Água Quente 28mm 3m', 'br', 79.9],
  // Conexões esgoto
  ['joelho-90-esgoto-40mm', 'Joelho 90° Esgoto 40mm', 'pç', 2.9],
  ['joelho-90-esgoto-50mm', 'Joelho 90° Esgoto 50mm', 'pç', 3.9],
  ['joelho-90-esgoto-75mm', 'Joelho 90° Esgoto 75mm', 'pç', 8.9],
  ['joelho-45-esgoto-40mm', 'Joelho 45° Esgoto 40mm', 'pç', 3.2],
  ['joelho-45-esgoto-50mm', 'Joelho 45° Esgoto 50mm', 'pç', 4.5],
  ['joelho-45-esgoto-100mm', 'Joelho 45° Esgoto 100mm', 'pç', 11.9],
  ['te-esgoto-40mm', 'Tê Esgoto 40mm', 'pç', 4.9],
  ['te-esgoto-50mm', 'Tê Esgoto 50mm', 'pç', 6.9],
  ['te-esgoto-75mm', 'Tê Esgoto 75mm', 'pç', 12.9],
  ['juncao-esgoto-50mm', 'Junção Simples Esgoto 50mm', 'pç', 8.9],
  ['juncao-esgoto-100mm', 'Junção Simples Esgoto 100mm', 'pç', 19.9],
  ['luva-esgoto-40mm', 'Luva Esgoto 40mm', 'pç', 1.9],
  ['luva-esgoto-50mm', 'Luva Esgoto 50mm', 'pç', 2.5],
  ['luva-esgoto-100mm', 'Luva Esgoto 100mm', 'pç', 6.9],
  ['cap-esgoto-50mm', 'Cap Esgoto 50mm', 'pç', 2.9],
  ['cap-esgoto-100mm', 'Cap Esgoto 100mm', 'pç', 7.9],
  ['reducao-esgoto-100x50', 'Redução Excêntrica Esgoto 100x50mm', 'pç', 9.9],
  ['reducao-esgoto-75x50', 'Redução Excêntrica Esgoto 75x50mm', 'pç', 7.9],
  // Conexões soldáveis
  ['joelho-soldavel-20mm', 'Joelho 90° Soldável 20mm', 'pç', 0.9],
  ['joelho-soldavel-25mm', 'Joelho 90° Soldável 25mm', 'pç', 1.2],
  ['joelho-soldavel-32mm', 'Joelho 90° Soldável 32mm', 'pç', 2.9],
  ['joelho-soldavel-50mm', 'Joelho 90° Soldável 50mm', 'pç', 6.9],
  ['te-soldavel-20mm', 'Tê Soldável 20mm', 'pç', 1.3],
  ['te-soldavel-25mm', 'Tê Soldável 25mm', 'pç', 1.9],
  ['te-soldavel-32mm', 'Tê Soldável 32mm', 'pç', 4.5],
  ['luva-soldavel-20mm', 'Luva Soldável 20mm', 'pç', 0.8],
  ['luva-soldavel-25mm', 'Luva Soldável 25mm', 'pç', 1.1],
  ['luva-soldavel-32mm', 'Luva Soldável 32mm', 'pç', 2.4],
  ['adaptador-soldavel-20mm', 'Adaptador Soldável com Rosca 20mm x 1/2"', 'pç', 1.5],
  ['adaptador-soldavel-25mm', 'Adaptador Soldável com Rosca 25mm x 3/4"', 'pç', 1.9],
  ['registro-esfera-20mm', 'Registro Esfera Soldável 20mm', 'pç', 14.9],
  ['registro-esfera-25mm', 'Registro Esfera Soldável 25mm', 'pç', 17.9],
  ['registro-esfera-32mm', 'Registro Esfera Soldável 32mm', 'pç', 27.9],
  ['registro-esfera-50mm', 'Registro Esfera Soldável 50mm', 'pç', 49.9],
  // Acessórios
  ['cola-pvc-175g', 'Adesivo Cola PVC 175g', 'un', 19.9],
  ['cola-pvc-850g', 'Adesivo Cola PVC 850g', 'un', 69.9],
  ['fita-veda-rosca-18mm', 'Fita Veda Rosca 18mm x 25m', 'rl', 7.9],
];

export const hydraulicProducts: ConstructionProduct[] = [
  ...fixed.map(([id, name, unit, price]) => ({ id, name, unit, basePrice: price, category: 'hidraulica' as const })),
  ...market.map(([id, name, unit, price]) => ({ id, name, unit, basePrice: d(price), category: 'hidraulica' as const })),
];
