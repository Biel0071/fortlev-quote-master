import { Quotation } from '@/types/quotation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { downloadPDF } from '@/utils/pdfGenerator';
import { openWhatsApp } from '@/utils/whatsapp';
import { FileText, Send, Trash2, LayoutDashboard, TrendingUp, Clock, CheckCircle } from 'lucide-react';

interface DashboardProps {
  quotations: Quotation[];
  onDelete: (id: string) => void;
}

const statusConfig = {
  pending: { label: 'Pendente', variant: 'secondary' as const },
  sent: { label: 'Enviado', variant: 'default' as const },
  approved: { label: 'Aprovado', variant: 'default' as const },
  rejected: { label: 'Rejeitado', variant: 'destructive' as const },
};

export const Dashboard = ({ quotations, onDelete }: DashboardProps) => {
  const totalValue = quotations.reduce((acc, q) => acc + q.total, 0);
  const pendingCount = quotations.filter(q => q.status === 'pending').length;
  const approvedCount = quotations.filter(q => q.status === 'approved').length;

  const stats = [
    {
      label: 'Total de Orçamentos',
      value: quotations.length,
      icon: LayoutDashboard,
      color: 'text-fortlev-blue',
    },
    {
      label: 'Valor Total',
      value: formatCurrency(totalValue),
      icon: TrendingUp,
      color: 'text-fortlev-yellow',
    },
    {
      label: 'Pendentes',
      value: pendingCount,
      icon: Clock,
      color: 'text-orange-500',
    },
    {
      label: 'Aprovados',
      value: approvedCount,
      icon: CheckCircle,
      color: 'text-green-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-card rounded-xl p-4 border border-border shadow-sm card-hover"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quotations List */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Orçamentos Recentes</h3>
        </div>

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
              .map((quotation) => (
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
                        <Badge variant={statusConfig[quotation.status].variant}>
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

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => downloadPDF(quotation)}
                          title="Baixar PDF"
                        >
                          <FileText className="h-4 w-4" />
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
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
