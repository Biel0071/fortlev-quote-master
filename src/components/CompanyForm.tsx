import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CompanyInfo } from '@/types/quotation';
import { Building2, Phone, Mail, Globe, User, Save, Trash2, Plus, Loader2 } from 'lucide-react';
import { useSavedCompanies } from '@/hooks/useSavedCompanies';
import { useSavedSellers, SavedSeller } from '@/hooks/useSavedSellers';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CompanyFormProps {
  companyInfo: CompanyInfo;
  onChange: (companyInfo: CompanyInfo) => void;
  onCompanyLock?: () => void;
}

export const CompanyForm = ({ companyInfo, onChange, onCompanyLock }: CompanyFormProps) => {
  const { companies: localSavedCompanies, saveCompany, deleteCompany } = useSavedCompanies();
  const { sellers, saveSeller, deleteSeller } = useSavedSellers();
  const [dbCompanies, setDbCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCompanies = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('issuing_companies')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (data) setDbCompanies(data);
      setLoading(false);
    };
    fetchCompanies();
  }, []);

  const allCompanies = [
    ...dbCompanies.map(c => ({
      name: c.name,
      trading_name: c.trading_name,
      cnpj: c.cnpj,
      address: c.address,
      phone: c.phone,
      email: c.email,
      website: c.website || '',
      sellerName: '',
      sellerRole: 'Consultor de Vendas'
    })),
    ...localSavedCompanies
  ];

  // Remove duplicates by CNPJ
  const companies = Array.from(new Map(allCompanies.map(c => [c.cnpj, c])).values());

  const handleChange = (field: keyof CompanyInfo, value: string) => {
    if (['name', 'cnpj', 'address', 'phone', 'email', 'website'].includes(field)) onCompanyLock?.();
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

  const handleSaveCompany = () => {
    if (!companyInfo.name.trim() || !companyInfo.cnpj.trim()) {
      toast({ title: 'Erro', description: 'Preencha pelo menos o nome e CNPJ da empresa', variant: 'destructive' });
      return;
    }
    saveCompany(companyInfo);
    toast({ title: 'Empresa salva!', description: `${companyInfo.name} foi salva com sucesso` });
  };

  const handleSelectCompany = (cnpj: string) => {
    const selected = companies.find(c => c.cnpj === cnpj);
    if (selected) {
      onChange(selected);
      toast({ title: 'Empresa carregada', description: `Dados de ${selected.name} carregados` });
    }
  };

  const handleDeleteCompany = () => {
    if (!companyInfo.cnpj) return;
    deleteCompany(companyInfo.cnpj);
    toast({ title: 'Empresa removida', variant: 'destructive' });
  };

  // ── Seller management ──
  const handleSaveSeller = () => {
    if (!companyInfo.sellerName.trim()) {
      toast({ title: 'Erro', description: 'Preencha o nome do vendedor', variant: 'destructive' });
      return;
    }
    const seller: SavedSeller = {
      id: companyInfo.sellerName.toLowerCase().replace(/\s+/g, '-'),
      name: companyInfo.sellerName,
      role: companyInfo.sellerRole || 'Vendedor',
    };
    saveSeller(seller);
    toast({ title: 'Vendedor salvo!', description: `${seller.name} salvo com sucesso` });
  };

  const handleSelectSeller = (id: string) => {
    const sel = sellers.find(s => s.id === id);
    if (sel) {
      onChange({ ...companyInfo, sellerName: sel.name, sellerRole: sel.role });
      toast({ title: 'Vendedor selecionado', description: sel.name });
    }
  };

  const handleDeleteSeller = () => {
    const id = companyInfo.sellerName.toLowerCase().replace(/\s+/g, '-');
    deleteSeller(id);
    toast({ title: 'Vendedor removido', variant: 'destructive' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Building2 className="h-5 w-5 text-fortlev-yellow" />
          Dados da Empresa Emissora
        </h3>
        
        <div className="flex items-center gap-2">
          {companies.length > 0 && (
            <Select onValueChange={handleSelectCompany}>
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="Empresas salvas" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.cnpj} value={company.cnpj}>{company.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button type="button" variant="outline" size="sm" onClick={handleSaveCompany} className="gap-1">
            <Save className="h-4 w-4" /> Salvar
          </Button>
          {companyInfo.cnpj && companies.some(c => c.cnpj === companyInfo.cnpj) && (
            <Button type="button" variant="ghost" size="sm" onClick={handleDeleteCompany} className="gap-1 text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="companyName" className="text-sm font-medium">Nome da Empresa</Label>
          <Input id="companyName" placeholder="Razão social da empresa" value={companyInfo.name} onChange={(e) => handleChange('name', e.target.value)} className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="companyCnpj" className="text-sm font-medium">CNPJ</Label>
          <Input id="companyCnpj" placeholder="00.000.000/0000-00" value={companyInfo.cnpj} onChange={(e) => handleChange('cnpj', formatCNPJ(e.target.value))} className="h-11" maxLength={18} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="companyAddress" className="text-sm font-medium">Endereço</Label>
        <Input id="companyAddress" placeholder="Rua, número, bairro, cidade - UF" value={companyInfo.address} onChange={(e) => handleChange('address', e.target.value)} className="h-11" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="companyPhone" className="text-sm font-medium flex items-center gap-1">
            <Phone className="h-4 w-4" /> Telefone / WhatsApp
          </Label>
          <Input id="companyPhone" placeholder="(00) 00000-0000" value={companyInfo.phone} onChange={(e) => handleChange('phone', e.target.value)} className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="companyEmail" className="text-sm font-medium flex items-center gap-1">
            <Mail className="h-4 w-4" /> E-mail
          </Label>
          <Input id="companyEmail" type="email" placeholder="contato@empresa.com.br" value={companyInfo.email} onChange={(e) => handleChange('email', e.target.value)} className="h-11" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="companyWebsite" className="text-sm font-medium flex items-center gap-1">
            <Globe className="h-4 w-4" /> Site
          </Label>
          <Input id="companyWebsite" placeholder="www.empresa.com.br" value={companyInfo.website} onChange={(e) => handleChange('website', e.target.value)} className="h-11" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="sellerName" className="text-sm font-medium flex items-center gap-1">
              <User className="h-4 w-4" /> Vendedor
            </Label>
            <div className="flex items-center gap-1">
              {sellers.length > 0 && (
                <Select onValueChange={handleSelectSeller}>
                  <SelectTrigger className="w-[130px] h-7 text-xs">
                    <SelectValue placeholder="Vendedores" />
                  </SelectTrigger>
                  <SelectContent>
                    {sellers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name} — {s.role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={handleSaveSeller} className="h-7 w-7 p-0">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <Input id="sellerName" placeholder="Nome completo" value={companyInfo.sellerName} onChange={(e) => handleChange('sellerName', e.target.value)} className="h-11" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sellerRole" className="text-sm font-medium">Cargo</Label>
          <Input id="sellerRole" placeholder="Gerente de Vendas" value={companyInfo.sellerRole} onChange={(e) => handleChange('sellerRole', e.target.value)} className="h-11" />
        </div>
      </div>
    </div>
  );
};
