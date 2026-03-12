import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Customer } from '@/types/quotation';
import { User, Phone, MapPin, Building, Search, Loader2, Save, Trash2, Plus } from 'lucide-react';
import { fetchCepData, formatAddress } from '@/utils/cepService';
import { toast } from '@/hooks/use-toast';
import { useSavedClients, SavedClient, SavedAddress } from '@/hooks/useSavedClients';

interface CustomerFormProps {
  customer: Customer;
  onChange: (customer: Customer) => void;
  showClientData: boolean;
  onShowClientDataChange: (show: boolean) => void;
}

/** Auto-detect CPF (11 digits) vs CNPJ (>11 digits) and format accordingly */
const formatCpfCnpj = (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  // CPF: up to 11 digits → 000.000.000-00
  if (cleaned.length <= 11) {
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
    if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
  }
  // CNPJ: 12-14 digits → 00.000.000/0000-00
  if (cleaned.length <= 12) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8)}`;
  return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12, 14)}`;
};

const getDocLabel = (value: string) => {
  const digits = value.replace(/\D/g, '').length;
  if (digits === 0) return 'CPF/CNPJ (opcional)';
  if (digits <= 11) return 'CPF';
  return 'CNPJ';
};

export const CustomerForm = ({ customer, onChange, showClientData, onShowClientDataChange }: CustomerFormProps) => {
  const [cep, setCep] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);
  const { clients, saveClient, deleteClient, addAddress, removeAddress } = useSavedClients();

  const handleChange = (field: keyof Customer, value: string) => {
    onChange({ ...customer, [field]: value });
  };

  const formatPhoneInput = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    if (cleaned.length <= 11) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  };

  const formatCepInput = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 5) return cleaned;
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}`;
  };

  const handleCepSearch = async () => {
    if (cep.replace(/\D/g, '').length !== 8) {
      toast({ title: 'CEP inválido', description: 'Digite um CEP com 8 dígitos', variant: 'destructive' });
      return;
    }
    setLoadingCep(true);
    const data = await fetchCepData(cep);
    setLoadingCep(false);
    if (data) {
      const address = formatAddress(data);
      handleChange('address', address);
      toast({ title: 'Endereço encontrado!', description: address });
    } else {
      toast({ title: 'CEP não encontrado', description: 'Verifique o CEP e tente novamente', variant: 'destructive' });
    }
  };

  const handleCepKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleCepSearch(); }
  };

  // ── Save / Load client ──
  const currentClientId = customer.cnpj ? customer.cnpj.replace(/\D/g, '') : '';

  const handleSaveClient = () => {
    if (!customer.name.trim()) {
      toast({ title: 'Erro', description: 'Preencha o nome do cliente para salvar', variant: 'destructive' });
      return;
    }
    const id = currentClientId || crypto.randomUUID();
    const existing = clients.find(c => c.id === id);
    const saved: SavedClient = {
      id,
      name: customer.name,
      cpfCnpj: customer.cnpj,
      phone: customer.phone,
      addresses: existing?.addresses ?? (customer.address ? [{ id: crypto.randomUUID(), label: 'Principal', full: customer.address }] : []),
    };
    saveClient(saved);
    toast({ title: 'Cliente salvo!', description: `${customer.name} salvo com sucesso` });
  };

  const handleSelectClient = (id: string) => {
    const sel = clients.find(c => c.id === id);
    if (!sel) return;
    onChange({ name: sel.name, cnpj: sel.cpfCnpj, phone: sel.phone, address: sel.addresses[0]?.full ?? '' });
    toast({ title: 'Cliente carregado', description: `Dados de ${sel.name} carregados` });
  };

  const handleDeleteClient = () => {
    if (!currentClientId) return;
    deleteClient(currentClientId);
    toast({ title: 'Cliente removido', variant: 'destructive' });
  };

  // ── Address management ──
  const matchedClient = clients.find(c => c.id === currentClientId);

  const handleSaveAddress = () => {
    if (!customer.address.trim()) return;
    if (!matchedClient) {
      handleSaveClient(); // save client first
      return;
    }
    const addr: SavedAddress = { id: crypto.randomUUID(), label: `Endereço ${matchedClient.addresses.length + 1}`, full: customer.address };
    addAddress(matchedClient.id, addr);
    toast({ title: 'Endereço salvo!' });
  };

  const handleSelectAddress = (addrId: string) => {
    const addr = matchedClient?.addresses.find(a => a.id === addrId);
    if (addr) handleChange('address', addr.full);
  };

  const handleRemoveAddress = (addrId: string) => {
    if (!matchedClient) return;
    removeAddress(matchedClient.id, addrId);
    toast({ title: 'Endereço removido', variant: 'destructive' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <User className="h-5 w-5 text-fortlev-yellow" />
          Dados do Cliente
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {clients.length > 0 && (
            <Select onValueChange={handleSelectClient}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Clientes salvos" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button type="button" variant="outline" size="sm" onClick={handleSaveClient} className="gap-1">
            <Save className="h-4 w-4" /> Salvar
          </Button>
          {matchedClient && (
            <Button type="button" variant="ghost" size="sm" onClick={handleDeleteClient} className="gap-1 text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <Label htmlFor="showClientData" className="text-sm text-muted-foreground">Incluir no orçamento</Label>
            <Switch id="showClientData" checked={showClientData} onCheckedChange={onShowClientDataChange} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">Nome / Razão Social</Label>
          <Input id="name" placeholder="Nome do cliente ou empresa" value={customer.name} onChange={(e) => handleChange('name', e.target.value)} className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cnpj" className="text-sm font-medium flex items-center gap-1">
            <Building className="h-4 w-4" />
            {getDocLabel(customer.cnpj)}
          </Label>
          <Input
            id="cnpj"
            placeholder="000.000.000-00 ou 00.000.000/0000-00"
            value={customer.cnpj}
            onChange={(e) => handleChange('cnpj', formatCpfCnpj(e.target.value))}
            className="h-11"
            maxLength={18}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-1">
            <Phone className="h-4 w-4" /> Telefone / WhatsApp
          </Label>
          <Input id="phone" placeholder="(00) 00000-0000" value={customer.phone} onChange={(e) => handleChange('phone', formatPhoneInput(e.target.value))} className="h-11" maxLength={16} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cep" className="text-sm font-medium flex items-center gap-1">
            <MapPin className="h-4 w-4" /> CEP
          </Label>
          <div className="flex gap-2">
            <Input id="cep" placeholder="00000-000" value={cep} onChange={(e) => setCep(formatCepInput(e.target.value))} onKeyDown={handleCepKeyDown} className="h-11" maxLength={9} />
            <Button type="button" variant="outline" size="icon" onClick={handleCepSearch} disabled={loadingCep} className="h-11 w-11 shrink-0">
              {loadingCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="address" className="text-sm font-medium flex items-center gap-1">
            <MapPin className="h-4 w-4" /> Endereço de Entrega
          </Label>
          <div className="flex items-center gap-1">
            {matchedClient && matchedClient.addresses.length > 0 && (
              <Select onValueChange={handleSelectAddress}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue placeholder="Endereços salvos" />
                </SelectTrigger>
                <SelectContent>
                  {matchedClient.addresses.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="truncate max-w-[160px] block">{a.label}: {a.full.slice(0, 40)}...</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={handleSaveAddress} className="gap-1 text-xs h-8">
              <Plus className="h-3 w-3" /> Salvar endereço
            </Button>
          </div>
        </div>
        <Input id="address" placeholder="Rua, número, bairro, cidade - UF" value={customer.address} onChange={(e) => handleChange('address', e.target.value)} className="h-11" />
        {matchedClient && matchedClient.addresses.length > 1 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {matchedClient.addresses.map(a => (
              <span key={a.id} className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-md">
                <button type="button" onClick={() => handleChange('address', a.full)} className="hover:underline truncate max-w-[200px]">{a.label}</button>
                <button type="button" onClick={() => handleRemoveAddress(a.id)} className="text-destructive hover:text-destructive/80 ml-1">×</button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
