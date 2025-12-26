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
    // Generate random alphanumeric string like "4SML1IQRJ80"
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  return {
    quotations,
    saveQuotation,
    updateQuotation,
    deleteQuotation,
    generateQuotationNumber,
  };
};
