import { Quotation, QuotationItem, Customer, PaymentConditions } from '@/types/quotation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { getProductFullDescription } from '@/utils/taxCalculator';
import { downloadPDF, downloadPNG } from '@/utils/pdfGenerator';
import { downloadNFePDF } from '@/utils/nfeGenerator';
import { openWhatsApp } from '@/utils/whatsapp';
import { 
  FileText, 
  Send, 
  Trash2, 
  LayoutDashboard, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  Receipt,
  Image,
  Package,
  DollarSign,
  BarChart3,
  PieChart,
  Calendar,
  AlertCircle,
  XCircle,
  Pencil,
  Eye,
  Filter,
  Search,
  X,
  Download
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartPie, Pie, Cell, BarChart, Bar } from 'recharts';
import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useIsAdmin } from '@/hooks/useIsAdmin';

interface DashboardProps {
  quotations: Quotation[];
  onDelete: (id: string) => void;
  onEdit?: (quotation: Quotation) => void;
  onSave?: (quotation: Quotation) => void;
}

const statusConfig = {
  pending: { label: 'Pendente', variant: 'secondary' as const, icon: Clock, color: 'text-orange-500' },
  sent: { label: 'Enviado', variant: 'default' as const, icon: Send, color: 'text-blue-500' },
  approved: { label: 'Aprovado', variant: 'default' as const, icon: CheckCircle, color: 'text-green-500' },
  rejected: { label: 'Rejeitado', variant: 'destructive' as const, icon: XCircle, color: 'text-destructive' },
};

const COLORS = ['hsl(45, 100%, 48%)', 'hsl(210, 80%, 15%)', 'hsl(205, 90%, 45%)', 'hsl(0, 84%, 60%)'];

export const Dashboard = ({ quotations, onDelete, onEdit, onSave }: DashboardProps) => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  const [nfeDialogOpen, setNfeDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [draftQuotation, setDraftQuotation] = useState<Quotation | null>(null);
  const [nfeNumber, setNfeNumber] = useState('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  // Apply filters
  const filteredQuotations = useMemo(() => {
    return quotations.filter(q => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch = 
          q.customer.name.toLowerCase().includes(search) ||
          q.number.toLowerCase().includes(search) ||
          q.customer.cnpj?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }
      
      // Status filter
      if (statusFilter !== 'all' && q.status !== statusFilter) {
        return false;
      }
      
      // Date filter
      if (dateFilter !== 'all') {
        const now = new Date();
        const qDate = new Date(q.createdAt);
        
        if (dateFilter === 'today') {
          const isToday = qDate.toDateString() === now.toDateString();
          if (!isToday) return false;
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (qDate < weekAgo) return false;
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (qDate < monthAgo) return false;
        }
      }
      
      return true;
    });
  }, [quotations, searchTerm, statusFilter, dateFilter]);

  const totalValue = quotations.reduce((acc, q) => acc + q.total, 0);
  const pendingCount = quotations.filter(q => q.status === 'pending').length;
  const sentCount = quotations.filter(q => q.status === 'sent').length;
  const approvedCount = quotations.filter(q => q.status === 'approved').length;
  const rejectedCount = quotations.filter(q => q.status === 'rejected').length;

  const totalItems = quotations.reduce((acc, q) => acc + q.items.reduce((sum, item) => sum + item.quantity, 0), 0);
  const avgTicket = quotations.length > 0 ? totalValue / quotations.length : 0;
  const approvedValue = quotations.filter(q => q.status === 'approved').reduce((acc, q) => acc + q.total, 0);

  // Dados para o gráfico de evolução
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        date: date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
        fullDate: date.toDateString(),
        valor: 0,
        quantidade: 0,
      };
    });

    quotations.forEach(q => {
      const qDate = new Date(q.createdAt).toDateString();
      const dayData = last7Days.find(d => d.fullDate === qDate);
      if (dayData) {
        dayData.valor += q.total;
        dayData.quantidade += 1;
      }
    });

    return last7Days;
  }, [quotations]);

  // Dados para o gráfico de pizza de status
  const statusData = useMemo(() => [
    { name: 'Pendentes', value: pendingCount, color: COLORS[0] },
    { name: 'Enviados', value: sentCount, color: COLORS[1] },
    { name: 'Aprovados', value: approvedCount, color: COLORS[2] },
    { name: 'Rejeitados', value: rejectedCount, color: COLORS[3] },
  ].filter(d => d.value > 0), [pendingCount, sentCount, approvedCount, rejectedCount]);

  // Produtos mais vendidos
  const topProducts = useMemo(() => {
    const productCount: Record<string, { name: string; count: number; value: number }> = {};

    const getItemLabel = (item: QuotationItem) => {
      return item.product.capacity > 0
        ? getProductFullDescription(item.product.type, item.product.capacity, item.product.unit)
        : item.product.name;
    };

    quotations.forEach((q) => {
      q.items.forEach((item) => {
        const label = getItemLabel(item);
        if (!productCount[label]) {
          productCount[label] = { name: label, count: 0, value: 0 };
        }
        productCount[label].count += item.quantity;
        productCount[label].value += item.subtotal;
      });
    });

    return Object.values(productCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [quotations]);

  const stats = [
    {
      label: 'Total de Orçamentos',
      value: quotations.length.toString(),
      icon: LayoutDashboard,
      color: 'text-fortlev-blue',
      bgColor: 'bg-fortlev-blue/10',
    },
    {
      label: 'Valor Total',
      value: formatCurrency(totalValue),
      icon: TrendingUp,
      color: 'text-fortlev-yellow',
      bgColor: 'bg-fortlev-yellow/10',
    },
    {
      label: 'Ticket Médio',
      value: formatCurrency(avgTicket),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Itens Vendidos',
      value: totalItems.toString(),
      icon: Package,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Pendentes',
      value: pendingCount.toString(),
      icon: Clock,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      label: 'Aprovados',
      value: approvedCount.toString(),
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      subValue: formatCurrency(approvedValue),
    },
  ];

  const handleGenerateNFe = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setNfeNumber('');
    setNfeDialogOpen(true);
  };

  const handleViewQuotation = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setViewDialogOpen(true);
  };

  const openEditQuotation = (quotation: Quotation) => {
    if (adminLoading) return;

    if (!isAdmin) {
      toast({
        title: 'Permissão necessária',
        description: 'Apenas administradores podem editar orçamentos.',
        variant: 'destructive',
      });
      return;
    }

    const clone: Quotation = {
      ...quotation,
      createdAt: new Date(quotation.createdAt),
      customer: { ...quotation.customer },
      companyInfo: { ...quotation.companyInfo },
      paymentConditions: { ...quotation.paymentConditions },
      items: quotation.items.map((it) => ({
        ...it,
        product: { ...it.product },
      })),
    };

    setDraftQuotation(clone);
    setEditDialogOpen(true);
  };

  const computeTotals = (q: Quotation) => {
    const subtotal = q.items.reduce((acc, it) => acc + (it.subtotal ?? it.unitPrice * it.quantity), 0);
    const freight = q.freight || 0;
    const discount = q.discount || 0;
    const total = subtotal - discount + freight;
    return { subtotal, total };
  };

  const saveDraft = () => {
    if (!draftQuotation) return;

    const normalizedItems = draftQuotation.items.map((it) => {
      const quantity = Number(it.quantity) || 0;
      const unitPrice = Number(it.unitPrice) || 0;
      return {
        ...it,
        quantity,
        unitPrice,
        subtotal: unitPrice * quantity,
      };
    });

    const next: Quotation = {
      ...draftQuotation,
      items: normalizedItems,
      ...computeTotals({ ...draftQuotation, items: normalizedItems }),
    };

    if (onSave) {
      onSave(next);
      toast({
        title: 'Alterações salvas!',
        description: `Orçamento ${next.number} atualizado com sucesso.`,
      });
      setEditDialogOpen(false);
      setDraftQuotation(null);
      // keep view dialog in sync
      setSelectedQuotation((prev) => (prev?.id === next.id ? next : prev));
      return;
    }

    // fallback: open in main form if parent didn't provide onSave
    if (onEdit) {
      onEdit(next);
      setEditDialogOpen(false);
      setDraftQuotation(null);
      return;
    }

    toast({
      title: 'Não foi possível salvar',
      description: 'Esta tela não recebeu a função de salvamento.',
      variant: 'destructive',
    });
  };

  const confirmGenerateNFe = async () => {
    if (!selectedQuotation || !nfeNumber) return;

    // Generate and download NFe PDF
    await downloadNFePDF(selectedQuotation, nfeNumber);
    
    toast({
      title: 'NFe Gerada com Sucesso!',
      description: `NFe número ${nfeNumber} baixada para o orçamento ${selectedQuotation.number}`,
    });
    
    setNfeDialogOpen(false);
    setSelectedQuotation(null);
    setNfeNumber('');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFilter('all');
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || dateFilter !== 'all';

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                  <p className="text-lg font-bold text-foreground truncate">{stat.value}</p>
                  {stat.subValue && (
                    <p className="text-xs text-muted-foreground">{stat.subValue}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evolução de Vendas */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-fortlev-yellow" />
              Evolução de Vendas (Últimos 7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {quotations.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>Sem dados para exibir</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(45, 100%, 48%)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(45, 100%, 48%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickFormatter={(value) => `R$${(value/1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Valor']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="valor" 
                    stroke="hsl(45, 100%, 48%)" 
                    fillOpacity={1} 
                    fill="url(#colorValor)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="h-5 w-5 text-fortlev-yellow" />
              Status dos Orçamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <PieChart className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>Sem dados</p>
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex items-center">
                <ResponsiveContainer width="50%" height="100%">
                  <RechartPie>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </RechartPie>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {statusData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm">{item.name}</span>
                      <span className="text-sm font-semibold ml-auto">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      {topProducts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-5 w-5 text-fortlev-yellow" />
              Produtos Mais Vendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fontSize: 11 }} 
                  width={80}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'count') return [value, 'Quantidade'];
                    return [formatCurrency(value), 'Valor'];
                  }}
                />
                <Bar dataKey="count" fill="hsl(210, 80%, 15%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-fortlev-yellow" />
              Filtros
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                <X className="h-4 w-4" />
                Limpar filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, nº ou CNPJ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="sent">Enviados</SelectItem>
                <SelectItem value="approved">Aprovados</SelectItem>
                <SelectItem value="rejected">Rejeitados</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo período</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Últimos 7 dias</SelectItem>
                <SelectItem value="month">Últimos 30 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {hasActiveFilters && (
            <p className="text-sm text-muted-foreground mt-3">
              Mostrando {filteredQuotations.length} de {quotations.length} orçamentos
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quotations List */}
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-fortlev-yellow" />
            Orçamentos Recentes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredQuotations.length === 0 ? (
            <div className="p-8 text-center">
              <LayoutDashboard className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">
                {quotations.length === 0 
                  ? 'Nenhum orçamento emitido' 
                  : 'Nenhum orçamento encontrado com os filtros aplicados'}
              </p>
              <p className="text-sm text-muted-foreground/70">
                {quotations.length === 0 
                  ? 'Crie seu primeiro orçamento na aba "Novo Orçamento"'
                  : 'Tente ajustar os filtros para ver mais resultados'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredQuotations
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((quotation) => {
                  const StatusIcon = statusConfig[quotation.status].icon;
                  return (
                    <div
                      key={quotation.id}
                      className="p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-medium text-fortlev-navy">
                              {quotation.number}
                            </span>
                            <Badge variant={statusConfig[quotation.status].variant} className="gap-1">
                              <StatusIcon className="h-3 w-3" />
                              {statusConfig[quotation.status].label}
                            </Badge>
                          </div>
                          <p className="font-medium text-foreground">{quotation.customer.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(new Date(quotation.createdAt))} • {quotation.items.length} itens
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xl font-bold text-fortlev-navy">
                              {formatCurrency(quotation.total)}
                            </p>
                          </div>

                          <div className="flex items-center gap-1 flex-wrap">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleViewQuotation(quotation)}
                              title="Visualizar detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openEditQuotation(quotation)}
                              title={isAdmin ? "Editar orçamento" : "Somente admin pode editar"}
                              disabled={adminLoading}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => downloadPDF(quotation)}
                              title="Baixar PDF"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => downloadPNG(quotation)}
                              title="Baixar PNG"
                            >
                              <Image className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleGenerateNFe(quotation)}
                              title="Gerar NFe"
                            >
                              <Receipt className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="whatsapp"
                              size="icon"
                              onClick={() => openWhatsApp(quotation)}
                              title="Enviar WhatsApp"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDelete(quotation.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Quotation Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-fortlev-yellow" />
              Detalhes do Orçamento
            </DialogTitle>
            <DialogDescription>
              Orçamento {selectedQuotation?.number}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            {selectedQuotation && (
              <div className="space-y-6">
                {/* Cliente */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Cliente</h4>
                  <Card>
                    <CardContent className="p-4 space-y-1">
                      <p className="font-medium text-lg">{selectedQuotation.customer.name}</p>
                      {selectedQuotation.customer.cnpj && (
                        <p className="text-sm text-muted-foreground">CNPJ: {selectedQuotation.customer.cnpj}</p>
                      )}
                      {selectedQuotation.customer.phone && (
                        <p className="text-sm text-muted-foreground">Telefone: {selectedQuotation.customer.phone}</p>
                      )}
                      {selectedQuotation.customer.address && (
                        <p className="text-sm text-muted-foreground">Endereço: {selectedQuotation.customer.address}</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Itens */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Itens do Orçamento</h4>
                  <Card>
                    <CardContent className="p-0">
                      <div className="divide-y divide-border">
                        {selectedQuotation.items.map((item, index) => (
                          <div key={item.id} className="p-4 flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <p className="font-medium">
                                {item.product.capacity > 0
                                  ? getProductFullDescription(item.product.type, item.product.capacity, item.product.unit)
                                  : item.product.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Qtd: {item.quantity} × {formatCurrency(item.unitPrice)}
                              </p>
                            </div>
                            <p className="font-semibold text-fortlev-navy">
                              {formatCurrency(item.subtotal)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Resumo Financeiro */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Resumo Financeiro</h4>
                  <Card>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span>{formatCurrency(selectedQuotation.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Desconto:</span>
                        <span className="text-green-600">- {formatCurrency(selectedQuotation.discount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Frete:</span>
                        <span className={selectedQuotation.freight === 0 ? 'text-green-600' : ''}>
                          {selectedQuotation.freight === 0 ? 'Grátis' : formatCurrency(selectedQuotation.freight || 0)}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span className="text-fortlev-navy">{formatCurrency(selectedQuotation.total)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Condições */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Condições</h4>
                  <Card>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Validade:</span>
                        <span>{selectedQuotation.validity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Prazo de Entrega:</span>
                        <span>{selectedQuotation.deliveryTime}</span>
                      </div>
                      {selectedQuotation.paymentConditions.cashDiscount && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">À Vista:</span>
                          <span>{selectedQuotation.paymentConditions.cashDiscount}</span>
                        </div>
                      )}
                      {selectedQuotation.paymentConditions.installments && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Parcelado:</span>
                          <span>{selectedQuotation.paymentConditions.installments}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Observações */}
                {selectedQuotation.observations && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Observações</h4>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm">{selectedQuotation.observations}</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => selectedQuotation && downloadPDF(selectedQuotation)}>
              <Download className="h-4 w-4 mr-2" />
              Baixar PDF
            </Button>
            <Button variant="outline" onClick={() => selectedQuotation && downloadPNG(selectedQuotation)}>
              <Image className="h-4 w-4 mr-2" />
              Baixar PNG
            </Button>
            <Button
              variant="outline"
              onClick={() => selectedQuotation && openEditQuotation(selectedQuotation)}
              disabled={adminLoading}
              title={isAdmin ? "Editar orçamento" : "Somente admin pode editar"}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Editar orçamento
            </Button>
            <DialogClose asChild>
              <Button>Fechar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Quotation Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-fortlev-yellow" />
              Editar Orçamento
            </DialogTitle>
            <DialogDescription>
              {draftQuotation ? `Orçamento ${draftQuotation.number}` : ""}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            {draftQuotation && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do cliente</Label>
                    <Input
                      value={draftQuotation.customer.name}
                      onChange={(e) =>
                        setDraftQuotation((prev) =>
                          prev
                            ? { ...prev, customer: { ...prev.customer, name: e.target.value } }
                            : prev,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input
                      value={draftQuotation.customer.phone}
                      onChange={(e) =>
                        setDraftQuotation((prev) =>
                          prev
                            ? { ...prev, customer: { ...prev.customer, phone: e.target.value } }
                            : prev,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CNPJ/CPF</Label>
                    <Input
                      value={draftQuotation.customer.cnpj}
                      onChange={(e) =>
                        setDraftQuotation((prev) =>
                          prev
                            ? { ...prev, customer: { ...prev.customer, cnpj: e.target.value } }
                            : prev,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Endereço</Label>
                    <Input
                      value={draftQuotation.customer.address}
                      onChange={(e) =>
                        setDraftQuotation((prev) =>
                          prev
                            ? { ...prev, customer: { ...prev.customer, address: e.target.value } }
                            : prev,
                        )
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={draftQuotation.status}
                      onValueChange={(v) =>
                        setDraftQuotation((prev) => (prev ? { ...prev, status: v as any } : prev))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="sent">Enviado</SelectItem>
                        <SelectItem value="approved">Aprovado</SelectItem>
                        <SelectItem value="rejected">Rejeitado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Frete (R$)</Label>
                    <Input
                      type="number"
                      value={draftQuotation.freight || 0}
                      onChange={(e) =>
                        setDraftQuotation((prev) =>
                          prev ? { ...prev, freight: Number(e.target.value) || 0 } : prev,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Desconto (R$)</Label>
                    <Input
                      type="number"
                      value={draftQuotation.discount || 0}
                      onChange={(e) =>
                        setDraftQuotation((prev) =>
                          prev ? { ...prev, discount: Number(e.target.value) || 0 } : prev,
                        )
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Validade</Label>
                    <Input
                      value={draftQuotation.validity}
                      onChange={(e) =>
                        setDraftQuotation((prev) => (prev ? { ...prev, validity: e.target.value } : prev))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Prazo de entrega</Label>
                    <Input
                      value={draftQuotation.deliveryTime}
                      onChange={(e) =>
                        setDraftQuotation((prev) =>
                          prev ? { ...prev, deliveryTime: e.target.value } : prev,
                        )
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Condições de pagamento (à vista)</Label>
                  <Input
                    value={draftQuotation.paymentConditions.cashDiscount}
                    onChange={(e) =>
                      setDraftQuotation((prev) =>
                        prev
                          ? {
                              ...prev,
                              paymentConditions: { ...prev.paymentConditions, cashDiscount: e.target.value },
                            }
                          : prev,
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Condições de pagamento (parcelado)</Label>
                  <Input
                    value={draftQuotation.paymentConditions.installments}
                    onChange={(e) =>
                      setDraftQuotation((prev) =>
                        prev
                          ? {
                              ...prev,
                              paymentConditions: { ...prev.paymentConditions, installments: e.target.value },
                            }
                          : prev,
                      )
                    }
                  />
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Itens</h4>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <div className="divide-y divide-border">
                      {draftQuotation.items.map((it, idx) => (
                        <div key={it.id} className="p-3 grid grid-cols-1 sm:grid-cols-5 gap-3 items-center">
                          <div className="sm:col-span-2">
                            <div className="font-medium">Caixa d'água {it.product.capacity}{it.product.unit}</div>
                            <div className="text-xs text-muted-foreground">Item #{idx + 1}</div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Qtd</Label>
                            <Input
                              type="number"
                              value={it.quantity}
                              onChange={(e) => {
                                const q = Number(e.target.value) || 0;
                                setDraftQuotation((prev) => {
                                  if (!prev) return prev;
                                  const items = prev.items.map((x) =>
                                    x.id === it.id ? { ...x, quantity: q, subtotal: q * (x.unitPrice || 0) } : x,
                                  );
                                  return { ...prev, items };
                                });
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Unit. (R$)</Label>
                            <Input
                              type="number"
                              value={it.unitPrice}
                              onChange={(e) => {
                                const p = Number(e.target.value) || 0;
                                setDraftQuotation((prev) => {
                                  if (!prev) return prev;
                                  const items = prev.items.map((x) =>
                                    x.id === it.id ? { ...x, unitPrice: p, subtotal: p * (x.quantity || 0) } : x,
                                  );
                                  return { ...prev, items };
                                });
                              }}
                            />
                          </div>
                          <div className="text-right font-semibold">
                            {formatCurrency(it.subtotal || it.unitPrice * it.quantity)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    rows={4}
                    value={draftQuotation.observations}
                    onChange={(e) =>
                      setDraftQuotation((prev) => (prev ? { ...prev, observations: e.target.value } : prev))
                    }
                  />
                </div>

                <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatCurrency(computeTotals(draftQuotation).subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Desconto</span>
                    <span>- {formatCurrency(draftQuotation.discount || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Frete</span>
                    <span>{formatCurrency(draftQuotation.freight || 0)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span>{formatCurrency(computeTotals(draftQuotation).total)}</span>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={saveDraft} disabled={!draftQuotation}>
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NFe Dialog */}
      <Dialog open={nfeDialogOpen} onOpenChange={setNfeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-fortlev-yellow" />
              Gerar Nota Fiscal Eletrônica
            </DialogTitle>
            <DialogDescription>
              Preencha o número da NFe para o orçamento {selectedQuotation?.number}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-medium">{selectedQuotation?.customer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor Total:</span>
                <span className="font-bold text-fortlev-navy">
                  {selectedQuotation ? formatCurrency(selectedQuotation.total) : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Itens:</span>
                <span>{selectedQuotation?.items.length} produto(s)</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nfe-number">Número da NFe</Label>
              <Input
                id="nfe-number"
                placeholder="Ex: 000001234"
                value={nfeNumber}
                onChange={(e) => setNfeNumber(e.target.value)}
              />
            </div>

            <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg">
              <Download className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">
                Ao confirmar, será gerado um PDF do DANFE com os dados do orçamento.
                Este documento é para controle interno.
              </p>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button 
              onClick={confirmGenerateNFe}
              disabled={!nfeNumber}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Gerar e Baixar NFe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
