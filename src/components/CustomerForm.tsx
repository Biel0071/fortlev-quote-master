import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Customer } from '@/types/quotation';
import { User, Phone, MapPin } from 'lucide-react';

interface CustomerFormProps {
  customer: Customer;
  onChange: (customer: Customer) => void;
}

export const CustomerForm = ({ customer, onChange }: CustomerFormProps) => {
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

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <User className="h-5 w-5 text-fortlev-yellow" />
        Dados do Cliente
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">
            Nome Completo
          </Label>
          <Input
            id="name"
            placeholder="Digite o nome do cliente"
            value={customer.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="h-11"
          />
        </div>
        
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
