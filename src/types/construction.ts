export interface ConstructionProduct {
  id: string;
  name: string;
  description?: string;
  unit: 'un' | 'kg' | 'm' | 'm²' | 'm³' | 'pç' | 'cx' | 'sc' | 'br' | 'rl';
  basePrice: number;
  category: ConstructionCategory;
}

export type ConstructionCategory = 
  | 'agregados'
  | 'cimentos'
  | 'blocos-tijolos'
  | 'telhas'
  | 'hidraulica'
  | 'eletrica'
  | 'ferramentas'
  | 'acabamentos'
  | 'estruturas'
  | 'madeiras'
  | 'churrasqueiras'
  | 'pisos-revestimentos'
  | 'pintura'
  | 'metais-loucas'
  | 'ferragens'
  | 'outros';

export interface ConstructionQuotationItem {
  id: string;
  product: ConstructionProduct;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discount?: number;
}

export interface ConstructionCustomer {
  name: string;
  cpfCnpj: string;
  phone: string;
  address: string;
}

export interface ConstructionCompanyInfo {
  name: string;
  cnpj: string;
  ie: string;
  address: string;
  phone: string;
  email: string;
  sellerName: string;
}

export interface ConstructionQuotation {
  id: string;
  number: string;
  customer: ConstructionCustomer;
  companyInfo: ConstructionCompanyInfo;
  items: ConstructionQuotationItem[];
  subtotal: number;
  discount: number;
  freight: number;
  total: number;
  validity: string;
  observations: string;
  paymentMethod: string;
  deliveryDate: string;
  showClientData: boolean;
  createdAt: Date;
  status: 'pending' | 'sent' | 'approved' | 'rejected';
}

export const unitLabels: Record<ConstructionProduct['unit'], string> = {
  'un': 'Unidade',
  'kg': 'Quilograma',
  'm': 'Metro',
  'm²': 'Metro²',
  'm³': 'Metro³',
  'pç': 'Peça',
  'cx': 'Caixa',
  'sc': 'Saco',
  'br': 'Barra',
  'rl': 'Rolo',
};

export const categoryLabels: Record<ConstructionCategory, string> = {
  'agregados': 'Agregados',
  'cimentos': 'Cimentos e Argamassas',
  'blocos-tijolos': 'Blocos e Tijolos',
  'telhas': 'Telhas e Coberturas',
  'hidraulica': 'Hidráulica',
  'eletrica': 'Elétrica',
  'ferramentas': 'Ferramentas',
  'acabamentos': 'Acabamentos',
  'estruturas': 'Estruturas',
  'madeiras': 'Madeiras',
  'churrasqueiras': 'Churrasqueiras',
  'pisos-revestimentos': 'Pisos e Revestimentos',
  'pintura': 'Pintura',
  'metais-loucas': 'Metais e Louças',
  'ferragens': 'Ferragens',
  'outros': 'Outros',
};
