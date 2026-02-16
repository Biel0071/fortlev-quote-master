import { useEffect, useState } from "react";
import { ConstructionQuotation } from "@/types/construction";

const STORAGE_KEY = "construction-quotations";

function reviveDates(records: any[]): ConstructionQuotation[] {
  return (records ?? []).map((q) => ({
    ...q,
    createdAt: q.createdAt ? new Date(q.createdAt) : new Date(),
  }));
}

export function useConstructionQuotations() {
  const [quotations, setQuotations] = useState<ConstructionQuotation[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      setQuotations(reviveDates(JSON.parse(stored)));
    } catch (e) {
      console.error("Error parsing construction quotations:", e);
    }
  }, []);

  const persist = (next: ConstructionQuotation[]) => {
    setQuotations(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const saveQuotation = (quotation: ConstructionQuotation) => {
    persist([quotation, ...quotations]);
  };

  const updateQuotation = (id: string, updates: Partial<ConstructionQuotation>) => {
    persist(quotations.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const deleteQuotation = (id: string) => {
    persist(quotations.filter((q) => q.id !== id));
  };

  const generateQuotationNumber = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 11; i++) {
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
}
