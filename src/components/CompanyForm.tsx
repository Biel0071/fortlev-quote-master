import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CompanyInfo } from '@/types/quotation';
import { Building2, Phone, Mail, Globe, User } from 'lucide-react';

interface CompanyFormProps {
  companyInfo: CompanyInfo;
  onChange: (companyInfo: CompanyInfo) => void;
}

export const CompanyForm = ({ companyInfo, onChange }: CompanyFormProps) => {
  const handleChange = (field: keyof CompanyInfo, value: string) => {
    onChange({ ...companyInfo, [field]: value });
  };

  const formatCNPJ = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 5) return `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`;
    if (cleaned.length <= 8) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5)}`;
    if (cleaned.length <= 12) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8)}`;
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12, 14)}`;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <Building2 className="h-5 w-5 text-fortlev-yellow" />
        Dados da Empresa Emissora
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="companyName" className="text-sm font-medium">
            Nome da Empresa
          </Label>
          <Input
            id="companyName"
            placeholder="Razão social da empresa"
            value={companyInfo.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="h-11"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="companyCnpj" className="text-sm font-medium">
            CNPJ
          </Label>
          <Input
            id="companyCnpj"
            placeholder="00.000.000/0000-00"
            value={companyInfo.cnpj}
            onChange={(e) => handleChange('cnpj', formatCNPJ(e.target.value))}
            className="h-11"
            maxLength={18}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="companyAddress" className="text-sm font-medium">
          Endereço
        </Label>
        <Input
          id="companyAddress"
          placeholder="Rua, número, bairro, cidade - UF"
          value={companyInfo.address}
          onChange={(e) => handleChange('address', e.target.value)}
          className="h-11"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="companyPhone" className="text-sm font-medium flex items-center gap-1">
            <Phone className="h-4 w-4" />
            Telefone / WhatsApp
          </Label>
          <Input
            id="companyPhone"
            placeholder="(00) 00000-0000"
            value={companyInfo.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className="h-11"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="companyEmail" className="text-sm font-medium flex items-center gap-1">
            <Mail className="h-4 w-4" />
            E-mail
          </Label>
          <Input
            id="companyEmail"
            type="email"
            placeholder="contato@empresa.com.br"
            value={companyInfo.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="h-11"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="companyWebsite" className="text-sm font-medium flex items-center gap-1">
            <Globe className="h-4 w-4" />
            Site
          </Label>
          <Input
            id="companyWebsite"
            placeholder="www.empresa.com.br"
            value={companyInfo.website}
            onChange={(e) => handleChange('website', e.target.value)}
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sellerName" className="text-sm font-medium flex items-center gap-1">
            <User className="h-4 w-4" />
            Nome do Vendedor
          </Label>
          <Input
            id="sellerName"
            placeholder="Nome completo"
            value={companyInfo.sellerName}
            onChange={(e) => handleChange('sellerName', e.target.value)}
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sellerRole" className="text-sm font-medium">
            Cargo
          </Label>
          <Input
            id="sellerRole"
            placeholder="Gerente de Vendas"
            value={companyInfo.sellerRole}
            onChange={(e) => handleChange('sellerRole', e.target.value)}
            className="h-11"
          />
        </div>
      </div>
    </div>
  );
};
