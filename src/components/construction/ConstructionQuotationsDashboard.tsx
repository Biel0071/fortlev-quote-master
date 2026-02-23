import { useMemo, useState } from "react";
import { ConstructionQuotation } from "@/types/construction";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Eye, Pencil, Trash2 } from "lucide-react";

interface ConstructionQuotationsDashboardProps {
  quotations: ConstructionQuotation[];
  onEdit: (quotation: ConstructionQuotation) => void;
  onDelete: (id: string) => void;
}

function statusLabel(status: ConstructionQuotation["status"]) {
  switch (status) {
    case "pending":
      return { label: "Pendente", variant: "secondary" as const };
    case "sent":
      return { label: "Enviado", variant: "default" as const };
    case "approved":
      return { label: "Aprovado", variant: "default" as const };
    case "rejected":
      return { label: "Rejeitado", variant: "destructive" as const };
    default:
      return { label: status, variant: "secondary" as const };
  }
}

export function ConstructionQuotationsDashboard({ quotations, onEdit, onDelete }: ConstructionQuotationsDashboardProps) {
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<ConstructionQuotation | null>(null);

  const recent = useMemo(() => {
    return [...quotations].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [quotations]);

  const openView = (q: ConstructionQuotation) => {
    setSelected(q);
    setViewOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Orçamentos salvos</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">Nenhum orçamento salvo ainda.</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Nº</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((q) => {
                    const s = statusLabel(q.status);
                    return (
                      <TableRow key={q.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{q.number}</TableCell>
                        <TableCell className="max-w-[260px] truncate">{q.customer?.name || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(new Date(q.createdAt))}</TableCell>
                        <TableCell>
                          <Badge variant={s.variant}>{s.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(q.total || 0)}</TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={() => openView(q)} title="Rever">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => onEdit(q)} title="Editar">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => onDelete(q.id)}
                              title="Excluir"
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Revisar orçamento {selected?.number}</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Cliente</div>
                  <div className="font-medium">{selected.customer?.name || "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Data</div>
                  <div className="font-medium">{formatDate(new Date(selected.createdAt))}</div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Item</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead className="text-right">Unit.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selected.items.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell className="font-medium">{it.product.name}</TableCell>
                        <TableCell className="text-center">{it.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(it.unitPrice)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(it.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end">
                <div className="min-w-[260px] rounded-lg border border-border bg-muted/20 p-4 text-sm space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatCurrency(selected.subtotal || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Desconto</span>
                    <span>{formatCurrency(selected.discount || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Frete</span>
                    <span>{(selected.freight || 0) === 0 ? "Grátis" : formatCurrency(selected.freight || 0)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span>{formatCurrency(selected.total || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
