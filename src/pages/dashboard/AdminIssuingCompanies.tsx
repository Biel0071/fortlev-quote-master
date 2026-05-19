import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pencil, Plus, Trash2, Building2, Globe, Phone, Mail, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Company = {
  id: string;
  name: string;
  trading_name: string;
  cnpj: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  website: string;
  is_active: boolean;
  is_default: boolean;
  seller_name?: string;
  seller_role?: string;
};

export default function AdminIssuingCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentCompany, setCurrentCompany] = useState<Partial<Company> | null>(null);

  const fetchCompanies = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("issuing_companies")
      .select("*")
      .order("name", { ascending: true });
    
    if (error) {
      toast({ title: "Erro ao carregar empresas", description: error.message, variant: "destructive" });
    } else {
      setCompanies(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleEdit = (company: Company) => {
    setCurrentCompany(company);
    setEditDialogOpen(true);
  };

  const handleAddNew = () => {
    setCurrentCompany({
      name: "",
      trading_name: "",
      cnpj: "",
      address: "",
      city: "",
      state: "",
      zip_code: "",
      phone: "",
      email: "",
      website: "",
      is_active: true,
      is_default: false,
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!currentCompany?.name || !currentCompany?.cnpj) {
      toast({ title: "Campos obrigatórios", description: "Nome e CNPJ são obrigatórios", variant: "destructive" });
      return;
    }

    if (currentCompany.id) {
      const { error } = await supabase
        .from("issuing_companies")
        .update(currentCompany)
        .eq("id", currentCompany.id);
      
      if (error) {
        toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Empresa atualizada com sucesso" });
        fetchCompanies();
        setEditDialogOpen(false);
      }
    } else {
      const { error } = await supabase
        .from("issuing_companies")
        .insert(currentCompany);
      
      if (error) {
        toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Empresa cadastrada com sucesso" });
        fetchCompanies();
        setEditDialogOpen(false);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Deseja realmente excluir esta empresa?")) {
      const { error } = await supabase.from("issuing_companies").delete().eq("id", id);
      if (error) {
        toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Empresa excluída" });
        fetchCompanies();
      }
    }
  };

  const toggleDefault = async (company: Company) => {
    // Reset all to false first
    await supabase.from("issuing_companies").update({ is_default: false }).neq("id", company.id);
    
    const { error } = await supabase
      .from("issuing_companies")
      .update({ is_default: !company.is_default })
      .eq("id", company.id);
    
    if (error) {
      toast({ title: "Erro ao alterar padrão", description: error.message, variant: "destructive" });
    } else {
      fetchCompanies();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Empresas Emissoras
          </h2>
          <p className="text-muted-foreground">Gerencie as empresas que emitem orçamentos e pedidos.</p>
        </div>
        <Button onClick={handleAddNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Empresa
        </Button>
      </div>

      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa / Trading</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">Carregando...</TableCell>
                </TableRow>
              ) : companies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">Nenhuma empresa cadastrada.</TableCell>
                </TableRow>
              ) : (
                companies.map((company) => (
                  <TableRow key={company.id} className="group hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground flex items-center gap-2">
                          {company.name}
                          {company.is_default && <Badge variant="secondary" className="text-[10px] h-4">PADRÃO</Badge>}
                        </span>
                        <span className="text-xs text-muted-foreground">{company.trading_name || company.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{company.cnpj}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" /> {company.email || "-"}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" /> {company.phone || "-"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{company.city} - {company.state}</span>
                        <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{company.address}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="p-0 hover:bg-transparent"
                        onClick={() => toggleDefault(company)}
                      >
                        {company.is_active ? (
                          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Ativo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            <XCircle className="h-3 w-3 mr-1" /> Inativo
                          </Badge>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(company)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(company.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{currentCompany?.id ? "Editar Empresa" : "Nova Empresa"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2 col-span-2">
              <Label>Razão Social</Label>
              <Input 
                value={currentCompany?.name || ""} 
                onChange={(e) => setCurrentCompany(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Empresa de Materiais LTDA"
              />
            </div>
            <div className="space-y-2">
              <Label>Nome Fantasia</Label>
              <Input 
                value={currentCompany?.trading_name || ""} 
                onChange={(e) => setCurrentCompany(prev => ({ ...prev, trading_name: e.target.value }))}
                placeholder="Ex: Depósito Vista Alegre"
              />
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input 
                value={currentCompany?.cnpj || ""} 
                onChange={(e) => setCurrentCompany(prev => ({ ...prev, cnpj: e.target.value }))}
                placeholder="00.000.000/0001-00"
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input 
                value={currentCompany?.email || ""} 
                onChange={(e) => setCurrentCompany(prev => ({ ...prev, email: e.target.value }))}
                placeholder="contato@empresa.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input 
                value={currentCompany?.phone || ""} 
                onChange={(e) => setCurrentCompany(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(00) 0000-0000"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Endereço Completo</Label>
              <Input 
                value={currentCompany?.address || ""} 
                onChange={(e) => setCurrentCompany(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Rua, Número, Bairro"
              />
            </div>
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input 
                value={currentCompany?.city || ""} 
                onChange={(e) => setCurrentCompany(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Cidade"
              />
            </div>
            <div className="space-y-2">
              <Label>Estado (UF)</Label>
              <Input 
                value={currentCompany?.state || ""} 
                onChange={(e) => setCurrentCompany(prev => ({ ...prev, state: e.target.value }))}
                placeholder="SP"
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Vendedor Padrão</Label>
              <Input 
                value={currentCompany?.seller_name || ""} 
                onChange={(e) => setCurrentCompany(prev => ({ ...prev, seller_name: e.target.value }))}
                placeholder="Nome do vendedor"
              />
            </div>
            <div className="space-y-2">
              <Label>Cargo / Assinatura</Label>
              <Input 
                value={currentCompany?.seller_role || ""} 
                onChange={(e) => setCurrentCompany(prev => ({ ...prev, seller_role: e.target.value }))}
                placeholder="Ex: Gerente Comercial"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}