import { Quotation } from '@/types/quotation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { downloadPDF, downloadPNG } from '@/utils/pdfGenerator';
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
  XCircle
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartPie, Pie, Cell, BarChart, Bar } from 'recharts';
import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

interface DashboardProps {
  quotations: Quotation[];
  onDelete: (id: string) => void;
}

const statusConfig = {
  pending: { label: 'Pendente', variant: 'secondary' as const, icon: Clock, color: 'text-orange-500' },
  sent: { label: 'Enviado', variant: 'default' as const, icon: Send, color: 'text-blue-500' },
  approved: { label: 'Aprovado', variant: 'default' as const, icon: CheckCircle, color: 'text-green-500' },
  rejected: { label: 'Rejeitado', variant: 'destructive' as const, icon: XCircle, color: 'text-destructive' },
};

const COLORS = ['hsl(45, 100%, 48%)', 'hsl(210, 80%, 15%)', 'hsl(205, 90%, 45%)', 'hsl(0, 84%, 60%)'];

export const Dashboard = ({ quotations, onDelete }: DashboardProps) => {
  const [nfeDialogOpen, setNfeDialogOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [nfeNumber, setNfeNumber] = useState('');

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
    
    quotations.forEach(q => {
      q.items.forEach(item => {
        const key = `${item.product.capacity}${item.product.unit}`;
        if (!productCount[key]) {
          productCount[key] = { name: key, count: 0, value: 0 };
        }
        productCount[key].count += item.quantity;
        productCount[key].value += item.subtotal;
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

  const confirmGenerateNFe = () => {
    if (!selectedQuotation || !nfeNumber) return;

    // Simular geração de NFe
    toast({
      title: 'NFe Gerada com Sucesso!',
      description: `NFe número ${nfeNumber} gerada para o orçamento ${selectedQuotation.number}`,
    });
    
    setNfeDialogOpen(false);
    setSelectedQuotation(null);
    setNfeNumber('');
  };

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

      {/* Quotations List */}
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-fortlev-yellow" />
            Orçamentos Recentes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {quotations.length === 0 ? (
            <div className="p-8 text-center">
              <LayoutDashboard className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">Nenhum orçamento emitido</p>
              <p className="text-sm text-muted-foreground/70">
                Crie seu primeiro orçamento na aba "Novo Orçamento"
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {quotations
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((quotation) => {
                  const StatusIcon = statusConfig[quotation.status].icon;
                  return (
                    <div
                      key={quotation.id}
                      className="p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
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

                          <div className="flex items-center gap-1">
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

            <div className="flex items-start gap-2 p-3 bg-orange-500/10 rounded-lg">
              <AlertCircle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
              <p className="text-sm text-orange-700">
                A emissão oficial da NFe deve ser feita através do sistema da Secretaria da Fazenda. 
                Este é apenas um registro interno para controle.
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
              <Receipt className="h-4 w-4" />
              Registrar NFe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
