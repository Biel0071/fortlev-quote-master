import { Quotation, FiscalStatus, FiscalInfo } from "@/types/quotation";
import { supabase } from "@/integrations/supabase/client";

/**
 * Generates a valid 44-digit NF-e access key following Brazilian standard.
 * Format: cUF[2] + AAMM[4] + CNPJ[14] + mod[2] + serie[3] + nNF[9] + tpEmis[1] + cNF[8] + cDV[1]
 */
export const generateRealAccessKey = (
  cnpj: string, 
  invoiceNumber: string, 
  series: string,
  emissionDate: Date = new Date()
): string => {
  const uf = "35"; // São Paulo by default
  const dateStr = emissionDate.toISOString().slice(2, 4) + (emissionDate.getMonth() + 1).toString().padStart(2, '0');
  const cleanCnpj = cnpj.replace(/\D/g, '').padStart(14, '0');
  const mod = "55"; // NF-e
  const cleanSeries = series.replace(/\D/g, '').padStart(3, '0');
  const cleanNumber = invoiceNumber.replace(/\D/g, '').padStart(9, '0');
  const tpEmis = "1"; // Normal emission
  const cNF = Math.floor(Math.random() * 99999999).toString().padStart(8, '0');
  
  const keyWithoutDV = uf + dateStr + cleanCnpj + mod + cleanSeries + cleanNumber + tpEmis + cNF;
  
  // Calculate DV (Digit Verifier)
  const weights = [2, 3, 4, 5, 6, 7, 8, 9];
  let sum = 0;
  let weightIndex = 0;
  for (let i = keyWithoutDV.length - 1; i >= 0; i--) {
    sum += parseInt(keyWithoutDV[i]) * weights[weightIndex % 8];
    weightIndex++;
  }
  const rest = sum % 11;
  const dv = (rest < 2 ? 0 : 11 - rest).toString();
  
  return keyWithoutDV + dv;
};

/**
 * Simulates the signing of a portal token for secure access.
 * In a real backend, this would use a secret key.
 */
export const generatePortalToken = (accessKey: string): string => {
  const secret = "lovable-fiscal-secure-secret-2026";
  // Simple "hash" for demonstration, in production use a real HMAC
  let hash = 0;
  const str = accessKey + secret;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36) + Math.random().toString(36).slice(2, 8);
};

/**
 * Mock function to "Authorize" a quotation as a real NF-e.
 * Persists all canonical data required for the DANFE and portal.
 */
export const authorizeFiscalQuotation = async (
  quotation: Quotation, 
  isFortlev: boolean = true
): Promise<Quotation> => {
  const invoiceNumber = Math.floor(Math.random() * 999999).toString().padStart(9, '0');
  const series = "1";
  const accessKey = generateRealAccessKey(quotation.companyInfo.cnpj, invoiceNumber, series);
  const portalToken = generatePortalToken(accessKey);
  const protocol = "1" + Math.floor(Math.random() * 99999999999999).toString().padStart(14, '0');
  const now = new Date();

  const fiscalInfo: FiscalInfo = {
    status: 'autorizada',
    accessKey,
    invoiceNumber,
    series,
    protocol,
    emissionAt: now,
    receiptAt: now,
    cStat: 100, // Authorized
    portalToken,
    xmlContent: `<?xml version="1.0" encoding="UTF-8"?><nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><NFe><infNFe Id="NFe${accessKey}" versao="4.00">...</infNFe></NFe><protNFe versao="4.00"><infProt><tpAmb>1</tpAmb><verAplic>W_PROD_1.0</verAplic><chNFe>${accessKey}</chNFe><dhRecbto>${now.toISOString()}</dhRecbto><nProt>${protocol}</nProt><digVal>...</digVal><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo></infProt></protNFe></nfeProc>`,
    xmlHash: Math.random().toString(36).slice(2)
  };

  const updatedQuotation = {
    ...quotation,
    fiscal: fiscalInfo
  };

  // Update DB
  const table = isFortlev ? 'fortlev_quotations' : 'construction_quotations';
  const { error } = await supabase.from(table).update({
    fiscal_status: fiscalInfo.status,
    access_key: fiscalInfo.accessKey,
    invoice_number: fiscalInfo.invoiceNumber,
    series: fiscalInfo.series,
    protocol: fiscalInfo.protocol,
    emission_at: fiscalInfo.emissionAt?.toISOString(),
    receipt_at: fiscalInfo.receiptAt?.toISOString(),
    c_stat: fiscalInfo.cStat,
    xml_content: fiscalInfo.xmlContent,
    xml_hash: fiscalInfo.xmlHash,
    portal_token: fiscalInfo.portalToken
  }).eq('id', quotation.id);

  if (error) {
    console.error("Authorization error:", error);
    throw new Error("Falha ao persistir dados fiscais: " + error.message);
  }

  return updatedQuotation;
};
