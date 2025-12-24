import { useState, useEffect } from 'react';
import { Quotation } from '@/types/quotation';

const STORAGE_KEY = 'fortlev-quotations';

export const useQuotations = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setQuotations(parsed.map((q: Quotation) => ({
          ...q,
          createdAt: new Date(q.createdAt),
        })));
      } catch (e) {
        console.error('Error parsing quotations:', e);
      }
    }
  }, []);

  const saveQuotation = (quotation: Quotation) => {
    const updated = [...quotations, quotation];
    setQuotations(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const updateQuotation = (id: string, updates: Partial<Quotation>) => {
    const updated = quotations.map(q => 
      q.id === id ? { ...q, ...updates } : q
    );
    setQuotations(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const deleteQuotation = (id: string) => {
    const updated = quotations.filter(q => q.id !== id);
    setQuotations(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const generateQuotationNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const count = quotations.filter(q => {
      const qDate = new Date(q.createdAt);
      return qDate.getFullYear() === year && qDate.getMonth() === date.getMonth();
    }).length + 1;
    return `ORC-${year}${month}-${String(count).padStart(4, '0')}`;
  };

  return {
    quotations,
    saveQuotation,
    updateQuotation,
    deleteQuotation,
    generateQuotationNumber,
  };
};
