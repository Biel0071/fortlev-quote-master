import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Customer } from '@/types/quotation';
import { User, Phone, MapPin, Building, Search, Loader2 } from 'lucide-react';
import { fetchCepData, formatAddress } from '@/utils/cepService';
import { toast } from '@/hooks/use-toast';

interface CustomerFormProps {
  customer: Customer;
  onChange: (customer: Customer) => void;
  showClientData: boolean;
  onShowClientDataChange: (show: boolean) => void;
}

export const CustomerForm = ({ customer, onChange, showClientData, onShowClientDataChange }: CustomerFormProps) => {
  const [cep, setCep] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);

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

  const formatCNPJ = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 5) return `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`;
    if (cleaned.length <= 8) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5)}`;
    if (cleaned.length <= 12) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8)}`;
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12, 14)}`;
  };

  const formatCepInput = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 5) return cleaned;
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}`;
  };

  const handleCepSearch = async () => {
    if (cep.replace(/\D/g, '').length !== 8) {
      toast({
        title: 'CEP inválido',
        description: 'Digite um CEP com 8 dígitos',
        variant: 'destructive',
      });
      return;
    }

    setLoadingCep(true);
    const data = await fetchCepData(cep);
    setLoadingCep(false);

    if (data) {
      const address = formatAddress(data);
      handleChange('address', address);
      toast({
        title: 'Endereço encontrado!',
        description: address,
      });
    } else {
      toast({
        title: 'CEP não encontrado',
        description: 'Verifique o CEP e tente novamente',
        variant: 'destructive',
      });
    }
  };

  const handleCepKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCepSearch();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <User className="h-5 w-5 text-fortlev-yellow" />
          Dados do Cliente
        </h3>
        <div className="flex items-center gap-2">
          <Label htmlFor="showClientData" className="text-sm text-muted-foreground">
            Incluir no orçamento
          </Label>
          <Switch
            id="showClientData"
            checked={showClientData}
            onCheckedChange={onShowClientDataChange}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">
            Nome / Razão Social
          </Label>
          <Input
            id="name"
            placeholder="Nome do cliente ou empresa"
            value={customer.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="h-11"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="cnpj" className="text-sm font-medium flex items-center gap-1">
            <Building className="h-4 w-4" />
            CNPJ/CPF (opcional)
          </Label>
          <Input
            id="cnpj"
            placeholder="00.000.000/0000-00"
            value={customer.cnpj}
            onChange={(e) => handleChange('cnpj', formatCNPJ(e.target.value))}
            className="h-11"
            maxLength={18}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-1">
            <Phone className="h-4 w-4" />
            Telefone / WhatsApp
          </Label>
          <Input
            id="phone"
            placeholder="(00) 00000-0000"
            value={customer.phone}
            onChange={(e) => handleChange('phone', formatPhoneInput(e.target.value))}
            className="h-11"
            maxLength={16}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="cep" className="text-sm font-medium flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            CEP
          </Label>
          <div className="flex gap-2">
            <Input
              id="cep"
              placeholder="00000-000"
              value={cep}
              onChange={(e) => setCep(formatCepInput(e.target.value))}
              onKeyDown={handleCepKeyDown}
              className="h-11"
              maxLength={9}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleCepSearch}
              disabled={loadingCep}
              className="h-11 w-11 shrink-0"
            >
              {loadingCep ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address" className="text-sm font-medium flex items-center gap-1">
          <MapPin className="h-4 w-4" />
          Endereço de Entrega
        </Label>
        <Input
          id="address"
          placeholder="Rua, número, bairro, cidade - UF"
          value={customer.address}
          onChange={(e) => handleChange('address', e.target.value)}
          className="h-11"
        />
      </div>
    </div>
  );
};
