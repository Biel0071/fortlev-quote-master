import { useState, useEffect } from 'react';

export interface SavedSeller {
  id: string;
  name: string;
  role: string;
}

const STORAGE_KEY = 'fortlev-saved-sellers';

export const useSavedSellers = () => {
  const [sellers, setSellers] = useState<SavedSeller[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setSellers(JSON.parse(stored));
  }, []);

  const persist = (list: SavedSeller[]) => {
    setSellers(list);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  const saveSeller = (seller: SavedSeller) => {
    const updated = [...sellers.filter(s => s.id !== seller.id), seller];
    persist(updated);
  };

  const deleteSeller = (id: string) => {
    persist(sellers.filter(s => s.id !== id));
  };

  return { sellers, saveSeller, deleteSeller };
};
