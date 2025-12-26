import { Product } from '@/types/quotation';

// Preços base da imagem de referência
// Fator multiplicador para tanques: 1.15 (15% mais caro)
// Fator para itens pequenos calculado por interpolação

const TANK_MULTIPLIER = 1.15;

// Preços conhecidos da imagem:
// 500L = R$ 190,00
// 1000L = R$ 249,00
// 2000L Tanque = R$ 600,00
// 3000L = R$ 650,00
// 5000L = R$ 1.699,00 / R$ 1.899,00
// 7500L = R$ 2.699,00
// 10000L = R$ 2.999,00 / Tanque = R$ 3.200,00
// 15000L Tanque = R$ 4.500,00
// 20000L Tanque = R$ 5.800,00

// Preços calculados para itens não listados (usando interpolação):
// 100L = ~R$ 89,00 (fator 0.47 do 500L)
// 150L = ~R$ 115,00 (interpolação)
// 250L = ~R$ 149,00 (interpolação)
// 310L = ~R$ 169,00 (interpolação)
// 750L = ~R$ 219,00 (interpolação entre 500L e 1000L)
// 1500L = ~R$ 399,00 (interpolação entre 1000L e 2000L)

export const products: Product[] = [
  {
    id: '1',
    name: 'Caixa d\'Água de Polietileno',
    capacity: 100,
    unit: 'L',
    height: '41 cm',
    diameter: '56 cm',
    basePrice: 89.00,
    type: 'caixa',
  },
  {
    id: '2',
    name: 'Caixa d\'Água de Polietileno',
    capacity: 150,
    unit: 'L',
    height: '48 cm',
    diameter: '64 cm',
    basePrice: 115.00,
    type: 'caixa',
  },
  {
    id: '3',
    name: 'Caixa d\'Água de Polietileno',
    capacity: 250,
    unit: 'L',
    height: '55 cm',
    diameter: '77 cm',
    basePrice: 149.00,
    type: 'caixa',
  },
  {
    id: '4',
    name: 'Caixa d\'Água de Polietileno',
    capacity: 310,
    unit: 'L',
    height: '60 cm',
    diameter: '82 cm',
    basePrice: 169.00,
    type: 'caixa',
  },
  {
    id: '5',
    name: 'Caixa d\'Água de Polietileno',
    capacity: 500,
    unit: 'L',
    height: '69 cm',
    diameter: '98 cm',
    basePrice: 190.00,
    type: 'caixa',
  },
  {
    id: '6',
    name: 'Caixa d\'Água de Polietileno',
    capacity: 750,
    unit: 'L',
    height: '80 cm',
    diameter: '110 cm',
    basePrice: 219.00,
    type: 'caixa',
  },
  {
    id: '7',
    name: 'Caixa d\'Água de Polietileno',
    capacity: 1000,
    unit: 'L',
    height: '88 cm',
    diameter: '122 cm',
    basePrice: 249.00,
    type: 'caixa',
  },
  {
    id: '8',
    name: 'Caixa d\'Água de Polietileno',
    capacity: 1500,
    unit: 'L',
    height: '100 cm',
    diameter: '140 cm',
    basePrice: 399.00,
    type: 'caixa',
  },
  {
    id: '9',
    name: 'Caixa d\'Água Tanque',
    capacity: 2000,
    unit: 'L',
    height: '110 cm',
    diameter: '154 cm',
    basePrice: 600.00,
    type: 'tanque',
  },
  {
    id: '10',
    name: 'Caixa d\'Água de Polietileno',
    capacity: 3000,
    unit: 'L',
    height: '128 cm',
    diameter: '176 cm',
    basePrice: 650.00,
    type: 'caixa',
  },
  {
    id: '11',
    name: 'Caixa d\'Água de Polietileno',
    capacity: 5000,
    unit: 'L',
    height: '153 cm',
    diameter: '208 cm',
    basePrice: 1699.00,
    type: 'caixa',
  },
  {
    id: '12',
    name: 'Caixa d\'Água Tanque',
    capacity: 5000,
    unit: 'L',
    height: '153 cm',
    diameter: '208 cm',
    basePrice: 1899.00,
    type: 'tanque',
  },
  {
    id: '13',
    name: 'Caixa d\'Água de Polietileno',
    capacity: 7500,
    unit: 'L',
    height: '175 cm',
    diameter: '240 cm',
    basePrice: 2699.00,
    type: 'caixa',
  },
  {
    id: '14',
    name: 'Caixa d\'Água de Polietileno',
    capacity: 10000,
    unit: 'L',
    height: '193 cm',
    diameter: '264 cm',
    basePrice: 2999.00,
    type: 'caixa',
  },
  {
    id: '15',
    name: 'Caixa d\'Água Tanque',
    capacity: 10000,
    unit: 'L',
    height: '193 cm',
    diameter: '264 cm',
    basePrice: 3200.00,
    type: 'tanque',
  },
  {
    id: '16',
    name: 'Caixa d\'Água Tanque',
    capacity: 15000,
    unit: 'L',
    height: '222 cm',
    diameter: '300 cm',
    basePrice: 4500.00,
    type: 'tanque',
  },
  {
    id: '17',
    name: 'Caixa d\'Água Tanque',
    capacity: 20000,
    unit: 'L',
    height: '245 cm',
    diameter: '330 cm',
    basePrice: 5800.00,
    type: 'tanque',
  },
];

export const getProductLabel = (product: Product): string => {
  const typeLabel = product.type === 'tanque' ? ' (Tanque)' : '';
  return `${product.capacity}${product.unit}${typeLabel} - ${product.name}`;
};

export const getProductPrice = (product: Product): number => {
  return product.basePrice;
};
