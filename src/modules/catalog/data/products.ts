import { Product } from '@/types/quotation';

// Preços base extraídos da imagem de referência
// Fator multiplicador para tanques: ~1.07 (7% mais caro)
// Fator para tanques industriais: ~1.12 (12% mais caro)
// Fator para versões verdes: ~1.10 (10% mais caro)

const TANK_MULTIPLIER = 1.07;
const INDUSTRIAL_MULTIPLIER = 1.12;
const GREEN_MULTIPLIER = 1.10;

// Preços base conhecidos (Caixa d'Água de Polietileno padrão):
// 100L = R$ 139,00
// 150L = R$ 159,00
// 250L = R$ 179,00
// 310L = R$ 199,00
// 500L = R$ 229,00
// 750L = R$ 289,00
// 1000L = R$ 338,00
// 1500L = R$ 549,00
// 2000L = R$ 689,00
// 3000L = R$ 976,00
// 5000L = R$ 1.999,00
// 7500L = R$ 2.899,00
// 10000L = R$ 3.499,00
// 15000L = R$ 4.900,00


// Caixas d'Água de Polietileno (Modelo Padrão)
export const caixasPolietileno: Product[] = [
  {
    id: 'caixa-100',
    name: "Caixa d'Água de Polietileno",
    capacity: 100,
    unit: 'L',
    height: '41 cm',
    diameter: '56 cm',
    basePrice: 139.00,
    type: 'caixa',
  },
  {
    id: 'caixa-150',
    name: "Caixa d'Água de Polietileno",
    capacity: 150,
    unit: 'L',
    height: '48 cm',
    diameter: '64 cm',
    basePrice: 159.00,
    type: 'caixa',
  },
  {
    id: 'caixa-250',
    name: "Caixa d'Água de Polietileno",
    capacity: 250,
    unit: 'L',
    height: '55 cm',
    diameter: '77 cm',
    basePrice: 179.00,
    type: 'caixa',
  },
  {
    id: 'caixa-310',
    name: "Caixa d'Água de Polietileno",
    capacity: 310,
    unit: 'L',
    height: '60 cm',
    diameter: '82 cm',
    basePrice: 199.00,
    type: 'caixa',
  },
  {
    id: 'caixa-500',
    name: "Caixa d'Água de Polietileno",
    capacity: 500,
    unit: 'L',
    height: '69 cm',
    diameter: '98 cm',
    basePrice: 229.00,
    type: 'caixa',
  },
  {
    id: 'caixa-750',
    name: "Caixa d'Água de Polietileno",
    capacity: 750,
    unit: 'L',
    height: '80 cm',
    diameter: '110 cm',
    basePrice: 289.00,
    type: 'caixa',
  },
  {
    id: 'caixa-1000',
    name: "Caixa d'Água de Polietileno",
    capacity: 1000,
    unit: 'L',
    height: '88 cm',
    diameter: '122 cm',
    basePrice: 338.00,
    type: 'caixa',
  },
  {
    id: 'caixa-1500',
    name: "Caixa d'Água de Polietileno",
    capacity: 1500,
    unit: 'L',
    height: '100 cm',
    diameter: '140 cm',
    basePrice: 549.00,
    type: 'caixa',
  },
  {
    id: 'caixa-2000',
    name: "Caixa d'Água de Polietileno",
    capacity: 2000,
    unit: 'L',
    height: '110 cm',
    diameter: '154 cm',
    basePrice: 689.00,
    type: 'caixa',
  },
  {
    id: 'caixa-3000',
    name: "Caixa d'Água de Polietileno",
    capacity: 3000,
    unit: 'L',
    height: '128 cm',
    diameter: '176 cm',
    basePrice: 976.00,
    type: 'caixa',
  },
  {
    id: 'caixa-5000',
    name: "Caixa d'Água de Polietileno",
    capacity: 5000,
    unit: 'L',
    height: '153 cm',
    diameter: '208 cm',
    basePrice: 1999.00,
    type: 'caixa',
  },
  {
    id: 'caixa-7500',
    name: "Caixa d'Água de Polietileno",
    capacity: 7500,
    unit: 'L',
    height: '175 cm',
    diameter: '240 cm',
    basePrice: 2899.00,
    type: 'caixa',
  },
  {
    id: 'caixa-10000',
    name: "Caixa d'Água de Polietileno",
    capacity: 10000,
    unit: 'L',
    height: '193 cm',
    diameter: '264 cm',
    basePrice: 3499.00,
    type: 'caixa',
  },
  {
    id: 'caixa-15000',
    name: "Caixa d'Água de Polietileno",
    capacity: 15000,
    unit: 'L',
    height: '222 cm',
    diameter: '300 cm',
    basePrice: 4900.00,
    type: 'caixa',
  },
];

// Tanques de Polietileno (Modelo Tanque Padrão) - De 500L até 30000L
export const tanquesPolietileno: Product[] = [
  {
    id: 'tanque-500',
    name: 'Tanque de Polietileno',
    capacity: 500,
    unit: 'L',
    height: '69 cm',
    diameter: '98 cm',
    basePrice: Math.round(190 * TANK_MULTIPLIER),
    type: 'tanque',
  },
  {
    id: 'tanque-750',
    name: 'Tanque de Polietileno',
    capacity: 750,
    unit: 'L',
    height: '80 cm',
    diameter: '110 cm',
    basePrice: Math.round(219 * TANK_MULTIPLIER),
    type: 'tanque',
  },
  {
    id: 'tanque-1000',
    name: 'Tanque de Polietileno',
    capacity: 1000,
    unit: 'L',
    height: '88 cm',
    diameter: '122 cm',
    basePrice: Math.round(249 * TANK_MULTIPLIER),
    type: 'tanque',
  },
  {
    id: 'tanque-1500',
    name: 'Tanque de Polietileno',
    capacity: 1500,
    unit: 'L',
    height: '100 cm',
    diameter: '140 cm',
    basePrice: Math.round(399 * TANK_MULTIPLIER),
    type: 'tanque',
  },
  {
    id: 'tanque-2000',
    name: 'Tanque de Polietileno',
    capacity: 2000,
    unit: 'L',
    height: '110 cm',
    diameter: '154 cm',
    basePrice: Math.round(520 * TANK_MULTIPLIER),
    type: 'tanque',
  },
  {
    id: 'tanque-3000',
    name: 'Tanque de Polietileno',
    capacity: 3000,
    unit: 'L',
    height: '128 cm',
    diameter: '176 cm',
    basePrice: Math.round(650 * TANK_MULTIPLIER),
    type: 'tanque',
  },
  {
    id: 'tanque-5000',
    name: 'Tanque de Polietileno',
    capacity: 5000,
    unit: 'L',
    height: '153 cm',
    diameter: '208 cm',
    basePrice: Math.round(1699 * TANK_MULTIPLIER),
    type: 'tanque',
  },
  {
    id: 'tanque-7500',
    name: 'Tanque de Polietileno',
    capacity: 7500,
    unit: 'L',
    height: '175 cm',
    diameter: '240 cm',
    basePrice: Math.round(2699 * TANK_MULTIPLIER),
    type: 'tanque',
  },
  {
    id: 'tanque-10000',
    name: 'Tanque de Polietileno',
    capacity: 10000,
    unit: 'L',
    height: '193 cm',
    diameter: '264 cm',
    basePrice: Math.round(2999 * TANK_MULTIPLIER),
    type: 'tanque',
  },
  {
    id: 'tanque-15000',
    name: 'Tanque de Polietileno',
    capacity: 15000,
    unit: 'L',
    height: '222 cm',
    diameter: '300 cm',
    basePrice: Math.round(4200 * TANK_MULTIPLIER),
    type: 'tanque',
  },
  {
    id: 'tanque-20000',
    name: 'Tanque de Polietileno',
    capacity: 20000,
    unit: 'L',
    height: '245 cm',
    diameter: '330 cm',
    basePrice: Math.round(5500 * TANK_MULTIPLIER),
    type: 'tanque',
  },
  {
    id: 'tanque-30000',
    name: 'Tanque de Polietileno',
    capacity: 30000,
    unit: 'L',
    height: '280 cm',
    diameter: '380 cm',
    basePrice: Math.round(7500 * TANK_MULTIPLIER),
    type: 'tanque',
  },
];

// Tanques Industriais de Polietileno
export const tanquesIndustriais: Product[] = [
  {
    id: 'tanque-ind-10000',
    name: 'Tanque Industrial de Polietileno',
    capacity: 10000,
    unit: 'L',
    height: '193 cm',
    diameter: '264 cm',
    basePrice: Math.round(2999 * INDUSTRIAL_MULTIPLIER),
    type: 'tanque-industrial',
  },
  {
    id: 'tanque-ind-15000',
    name: 'Tanque Industrial de Polietileno',
    capacity: 15000,
    unit: 'L',
    height: '222 cm',
    diameter: '300 cm',
    basePrice: Math.round(4200 * INDUSTRIAL_MULTIPLIER),
    type: 'tanque-industrial',
  },
  {
    id: 'tanque-ind-20000',
    name: 'Tanque Industrial de Polietileno',
    capacity: 20000,
    unit: 'L',
    height: '245 cm',
    diameter: '330 cm',
    basePrice: Math.round(5500 * INDUSTRIAL_MULTIPLIER),
    type: 'tanque-industrial',
  },
];

// Tanques de Polietileno - Versão Verde
export const tanquesVerdes: Product[] = [
  {
    id: 'tanque-verde-10000',
    name: 'Tanque de Polietileno - Verde',
    capacity: 10000,
    unit: 'L',
    height: '193 cm',
    diameter: '264 cm',
    basePrice: Math.round(2999 * GREEN_MULTIPLIER),
    type: 'tanque-verde',
  },
  {
    id: 'tanque-verde-15000',
    name: 'Tanque de Polietileno - Verde',
    capacity: 15000,
    unit: 'L',
    height: '222 cm',
    diameter: '300 cm',
    basePrice: Math.round(4200 * GREEN_MULTIPLIER),
    type: 'tanque-verde',
  },
  {
    id: 'tanque-verde-20000',
    name: 'Tanque de Polietileno - Verde',
    capacity: 20000,
    unit: 'L',
    height: '245 cm',
    diameter: '330 cm',
    basePrice: Math.round(5500 * GREEN_MULTIPLIER),
    type: 'tanque-verde',
  },
  {
    id: 'tanque-verde-30000',
    name: 'Tanque de Polietileno - Verde',
    capacity: 30000,
    unit: 'L',
    height: '280 cm',
    diameter: '380 cm',
    basePrice: Math.round(7500 * GREEN_MULTIPLIER),
    type: 'tanque-verde',
  },
];

// Todos os produtos combinados
export const products: Product[] = [
  ...caixasPolietileno,
  ...tanquesPolietileno,
  ...tanquesIndustriais,
  ...tanquesVerdes,
];

// Categorias de produtos para filtro
export const productCategories = {
  caixa: {
    label: "Caixas d'Água de Polietileno",
    products: caixasPolietileno,
  },
  tanque: {
    label: 'Tanques de Polietileno',
    products: tanquesPolietileno,
  },
  'tanque-industrial': {
    label: 'Tanques Industriais',
    products: tanquesIndustriais,
  },
  'tanque-verde': {
    label: 'Tanques Verdes',
    products: tanquesVerdes,
  },
};

export const getProductLabel = (product: Product): string => {
  const typeLabels: Record<string, string> = {
    'caixa': '',
    'tanque': ' (Tanque)',
    'tanque-industrial': ' (Industrial)',
    'tanque-verde': ' (Verde)',
  };
  const typeLabel = typeLabels[product.type] || '';
  return `${product.capacity.toLocaleString('pt-BR')}${product.unit}${typeLabel} - ${product.name}`;
};

export const getProductPrice = (product: Product): number => {
  return product.basePrice;
};

export const getProductsByCategory = (category: string): Product[] => {
  return productCategories[category as keyof typeof productCategories]?.products || [];
};
