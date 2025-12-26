// Tax calculation utilities based on Brazilian tax standards

export interface TaxRates {
  icms: number;      // ICMS - Imposto sobre Circulação de Mercadorias e Serviços
  ipi: number;       // IPI - Imposto sobre Produtos Industrializados
  pis: number;       // PIS - Programa de Integração Social
  cofins: number;    // COFINS - Contribuição para o Financiamento da Seguridade Social
}

export interface TaxCalculation {
  baseCalculo: number;
  icmsValue: number;
  ipiValue: number;
  pisValue: number;
  cofinsValue: number;
  totalTaxes: number;
  totalWithTaxes: number;
  taxPercentage: number;
}

// Default tax rates for São Paulo state (can be customized per state)
export const DEFAULT_TAX_RATES: TaxRates = {
  icms: 0.12,     // 12% - ICMS interestadual para produtos industrializados
  ipi: 0.00,      // 0% - IPI (normalmente isento para caixas d'água)
  pis: 0.0165,    // 1.65% - PIS não cumulativo
  cofins: 0.076,  // 7.6% - COFINS não cumulativo
};

// Simplified rates for small businesses (Simples Nacional)
export const SIMPLES_TAX_RATES: TaxRates = {
  icms: 0.034,    // 3.4% aproximado no Simples
  ipi: 0.00,
  pis: 0.00,      // Já incluído no Simples
  cofins: 0.00,   // Já incluído no Simples
};

// NCM codes for water tanks
export const NCM_CODES = {
  caixa: '39229000',        // Artigos de transporte ou embalagem de plásticos
  tanque: '39229000',       // Reservatórios, cisternas de plástico
  'tanque-industrial': '39229000',
  'tanque-verde': '39229000',
};

// CST codes
export const CST_CODES = {
  normal: '000',  // Tributada integralmente
  isento: '040',  // Isenta
  reducao: '020', // Com redução de base de cálculo
};

// CFOP codes
export const CFOP_CODES = {
  vendaEstado: '5.102',       // Venda de mercadoria dentro do estado
  vendaForaEstado: '6.102',   // Venda de mercadoria fora do estado
  vendaExterior: '7.102',     // Venda para exterior
};

export const calculateTaxes = (
  productValue: number,
  quantity: number,
  rates: TaxRates = DEFAULT_TAX_RATES
): TaxCalculation => {
  const baseCalculo = productValue * quantity;
  
  const icmsValue = baseCalculo * rates.icms;
  const ipiValue = baseCalculo * rates.ipi;
  const pisValue = baseCalculo * rates.pis;
  const cofinsValue = baseCalculo * rates.cofins;
  
  const totalTaxes = icmsValue + ipiValue + pisValue + cofinsValue;
  const totalWithTaxes = baseCalculo + ipiValue; // IPI soma ao valor, outros estão inclusos
  
  const taxPercentage = (totalTaxes / baseCalculo) * 100;
  
  return {
    baseCalculo,
    icmsValue,
    ipiValue,
    pisValue,
    cofinsValue,
    totalTaxes,
    totalWithTaxes,
    taxPercentage,
  };
};

export const calculateTotalTaxes = (
  items: Array<{ unitPrice: number; quantity: number }>,
  rates: TaxRates = DEFAULT_TAX_RATES
): TaxCalculation => {
  const totalBase = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  
  return calculateTaxes(totalBase, 1, rates);
};

export const formatTaxPercentage = (value: number): string => {
  return `${value.toFixed(2)}%`;
};

export const getProductTypeDescription = (type: string): string => {
  switch (type) {
    case 'caixa':
      return "Caixa d'Água Polietileno";
    case 'tanque':
      return 'Tanque Polietileno';
    case 'tanque-industrial':
      return 'Tanque Industrial Polietileno';
    case 'tanque-verde':
      return 'Tanque Verde Polietileno';
    default:
      return 'Produto Fortlev';
  }
};

export const getProductFullDescription = (
  type: string,
  capacity: number,
  unit: string,
  name?: string
): string => {
  const typeDesc = getProductTypeDescription(type);
  const capacityDesc = `${capacity} ${unit}`;
  return `${typeDesc} ${capacityDesc}${name ? ` - ${name}` : ''}`;
};

export const getNcmCode = (type: string): string => {
  return NCM_CODES[type as keyof typeof NCM_CODES] || NCM_CODES.caixa;
};

export const getCfopCode = (isInterstate: boolean = false): string => {
  return isInterstate ? CFOP_CODES.vendaForaEstado : CFOP_CODES.vendaEstado;
};
