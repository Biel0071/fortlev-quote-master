import { useState, useEffect } from 'react';
import { CompanyInfo } from '@/types/quotation';

const STORAGE_KEY = 'fortlev-saved-companies';

export const useSavedCompanies = () => {
  const [companies, setCompanies] = useState<CompanyInfo[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setCompanies(JSON.parse(stored));
    }
  }, []);

  const saveCompany = (company: CompanyInfo) => {
    const updated = [...companies.filter(c => c.cnpj !== company.cnpj), company];
    setCompanies(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const deleteCompany = (cnpj: string) => {
    const updated = companies.filter(c => c.cnpj !== cnpj);
    setCompanies(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return { companies, saveCompany, deleteCompany };
};
