export interface Product {
  id: string;
  name: string;
  capacity: number;
  unit: string;
  height: string;
  diameter: string;
  basePrice: number;
  type: 'caixa' | 'tanque' | 'tanque-industrial' | 'tanque-verde';
}

export interface QuotationItem {
  id: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Customer {
  name: string;
  cnpj: string;
  phone: string;
  address: string;
  email?: string;
}

export interface CompanyInfo {
  name: string;
  cnpj: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  sellerName: string;
  sellerRole: string;
}

export interface PaymentConditions {
  cashDiscount: string;
  installments: string;
  downPayment: string;
}

export interface TaxInfo {
  icmsBase: number;
  icmsValue: number;
  icmsRate: number;
  ipiValue: number;
  pisValue: number;
  cofinsValue: number;
  totalTaxes: number;
  taxPercentage: number;
}

export interface QuotationBranding {
  /** When false, removes the "FORTLEV" brand mark from preview/PDF/PNG/WhatsApp. */
  showBrand: boolean;
  /** Optional brand text to show in the header when showBrand=true. Defaults to "FORTLEV". */
  brandText?: string;
}

export type FiscalStatus = 
  | 'autorizada'
  | 'autorizada_fora_prazo'
  | 'em_processamento'
  | 'cancelada'
  | 'rejeitada'
  | 'indisponivel'
  | 'pre_visualizacao_sem_validade_fiscal';

export interface FiscalInfo {
  status: FiscalStatus;
  accessKey?: string;
  invoiceNumber?: string;
  series?: string;
  protocol?: string;
  emissionAt?: Date;
  receiptAt?: Date;
  cStat?: number;
  xmlContent?: string;
  xmlHash?: string;
  portalToken?: string;
}

export interface Quotation {
  id: string;
  companyId?: string;
  leadId?: string;
  isOrder?: boolean;
  number: string;
  customer: Customer;
  companyInfo: CompanyInfo;
  items: QuotationItem[];
  subtotal: number;
  discount: number;
  freight: number;
  total: number;
  taxes?: TaxInfo;
  validity: string;
  observations: string;
  paymentConditions: PaymentConditions;
  deliveryTime: string;
  showClientData: boolean;
  createdAt: Date;
  status: 'pending' | 'sent' | 'approved' | 'rejected';
  branding?: QuotationBranding;
  fiscal?: FiscalInfo;
}


