import { useState, useEffect } from 'react';

export interface SavedClient {
  id: string;
  name: string;
  cpfCnpj: string;
  phone: string;
  addresses: SavedAddress[];
}

export interface SavedAddress {
  id: string;
  label: string;
  full: string;
}

const STORAGE_KEY = 'fortlev-saved-clients';

export const useSavedClients = () => {
  const [clients, setClients] = useState<SavedClient[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setClients(JSON.parse(stored));
  }, []);

  const persist = (list: SavedClient[]) => {
    setClients(list);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  const saveClient = (client: SavedClient) => {
    const updated = [...clients.filter(c => c.id !== client.id), client];
    persist(updated);
  };

  const deleteClient = (id: string) => {
    persist(clients.filter(c => c.id !== id));
  };

  const addAddress = (clientId: string, address: SavedAddress) => {
    const updated = clients.map(c => {
      if (c.id !== clientId) return c;
      return { ...c, addresses: [...c.addresses.filter(a => a.id !== address.id), address] };
    });
    persist(updated);
  };

  const removeAddress = (clientId: string, addressId: string) => {
    const updated = clients.map(c => {
      if (c.id !== clientId) return c;
      return { ...c, addresses: c.addresses.filter(a => a.id !== addressId) };
    });
    persist(updated);
  };

  return { clients, saveClient, deleteClient, addAddress, removeAddress };
};
