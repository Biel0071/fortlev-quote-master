import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Filter, Phone, Mail, FileText, TrendingUp, History, MessageSquare } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  source: string;
  total_spent: number;
  last_purchase: string;
  created_at: string;
};

export default function AdminCrmLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("crm_leads")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      toast({ title: "Erro ao carregar leads", description: error.message, variant: "destructive" });
    } else {
      setLeads(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const filteredLeads = leads.filter(l => 
    l.name.toLowerCase().includes(search.toLowerCase()) || 
    (l.email && l.email.toLowerCase().includes(search.toLowerCase())) ||
    (l.phone && l.phone.includes(search))
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new": return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Novo</Badge>;
      case "contact": return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">Em Contato</Badge>;
      case "quoting": return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">Orcando</Badge>;
      case "closed": return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Fechado</Badge>;
      case "lost": return <Badge variant="outline" className="text-muted-foreground">Perdido</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg"><Users className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Total de Leads</p>
                <p className="text-xl font-bold">{leads.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg"><TrendingUp className="h-5 w-5 text-emerald-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Conversão</p>
                <p className="text-xl font-bold">12.4%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg"><MessageSquare className="h-5 w-5 text-blue-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Novos (Hoje)</p>
                <p className="text-xl font-bold">3</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg"><History className="h-5 w-5 text-orange-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Recorrência</p>
                <p className="text-xl font-bold">28%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nome, e-mail ou telefone..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
          <Button className="gap-2"><Users className="h-4 w-4" /> Novo Lead</Button>
        </div>
      </div>

      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Última Compra</TableHead>
                <TableHead className="text-right">Total Gasto</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center">Carregando...</TableCell></TableRow>
              ) : filteredLeads.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center">Nenhum lead encontrado.</TableCell></TableRow>
              ) : (
                filteredLeads.map((lead) => (
                  <TableRow key={lead.id} className="group hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{lead.name}</span>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Mail className="h-3 w-3" /> {lead.email || "-"}</span>
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Phone className="h-3 w-3" /> {lead.phone || "-"}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(lead.status)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase">{lead.source}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {lead.last_purchase ? new Date(lead.last_purchase).toLocaleDateString("pt-BR") : "Nunca"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(lead.total_spent)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Ver Histórico"><History className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Novo Orçamento"><FileText className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}