import { useMemo, useState } from "react";
import { ConstructionQuotation } from "@/types/construction";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Eye, Pencil, Trash2, Copy } from "lucide-react";

interface ConstructionQuotationsDashboardProps {
  quotations: ConstructionQuotation[];
  onEdit: (quotation: ConstructionQuotation) => void;
  onDelete: (id: string) => void;
  onSave?: (quotation: ConstructionQuotation) => void;
  onDuplicate?: (id: string) => void;
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

export function ConstructionQuotationsDashboard({ quotations, onEdit, onDelete, onSave, onDuplicate }: ConstructionQuotationsDashboardProps) {
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<ConstructionQuotation | null>(null);
  const [draft, setDraft] = useState<ConstructionQuotation | null>(null);

  const recent = useMemo(() => {
    return [...quotations].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [quotations]);

  const openView = (q: ConstructionQuotation) => {
    setSelected(q);
    setViewOpen(true);
  };

  const openEdit = (q: ConstructionQuotation) => {
    if (adminLoading) return;

    if (!isAdmin) {
      toast({
        title: "Permissão necessária",
        description: "Apenas administradores podem editar orçamentos.",
        variant: "destructive",
      });
      return;
    }

    const clone: ConstructionQuotation = {
      ...q,
      createdAt: new Date(q.createdAt),
      customer: { ...q.customer },
      companyInfo: { ...q.companyInfo },
      items: q.items.map((it) => ({
        ...it,
        product: { ...it.product },
      })),
    };

    setDraft(clone);
    setEditOpen(true);
  };

  const saveDraft = () => {
    if (!draft) return;

    const normalizedItems = draft.items.map((it) => {
      const quantity = Number(it.quantity) || 0;
      const unitPrice = Number(it.unitPrice) || 0;
      return {
        ...it,
        quantity,
        unitPrice,
        subtotal: quantity * unitPrice,
      };
    });

    const subtotal = normalizedItems.reduce((acc, it) => acc + it.subtotal, 0);
    const total = subtotal - (draft.discount || 0) + (draft.freight || 0);

    const next: ConstructionQuotation = {
      ...draft,
      items: normalizedItems,
      subtotal,
      total,
    };

    if (onSave) {
      onSave(next);
      toast({
        title: "Alterações salvas!",
        description: `Orçamento ${next.number} atualizado com sucesso.`,
      });
      setEditOpen(false);
      setDraft(null);
      setSelected((prev) => (prev?.id === next.id ? next : prev));
      return;
    }

    // fallback: editar no formulário principal
    onEdit(next);
    setEditOpen(false);
    setDraft(null);
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
                    <TableHead>Itens</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                      {recent.map((q) => {
                        const s = statusLabel(q.status);
                        const itemsSummary = (() => {
                          const items = q.items ?? [];
                          if (items.length === 0) return "—";
                          const head = items
                            .slice(0, 2)
                            .map((it) => it.product?.name || "—")
                            .join(", ");
                          const rest = items.length > 2 ? ` +${items.length - 2}` : "";
                          return `${head}${rest}`;
                        })();

                        return (
                          <TableRow key={q.id} className="hover:bg-muted/30">
                            <TableCell className="font-medium">{q.number}</TableCell>
                            <TableCell className="max-w-[240px] truncate">{q.customer?.name || "—"}</TableCell>
                            <TableCell className="max-w-[340px] truncate text-sm text-muted-foreground" title={itemsSummary}>
                              {itemsSummary}
                            </TableCell>
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
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openEdit(q)}
                              title={isAdmin ? "Editar orçamento" : "Somente admin pode editar"}
                              disabled={adminLoading}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {onDuplicate && (
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => onDuplicate(q.id)}
                                title="Duplicar orçamento"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            )}
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

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => selected && openEdit(selected)}
                  disabled={adminLoading}
                  title={isAdmin ? "Editar orçamento" : "Somente admin pode editar"}
                >
                  <Pencil className="h-4 w-4" />
                  Editar orçamento
                </Button>
                <DialogClose asChild>
                  <Button>Fechar</Button>
                </DialogClose>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar orçamento {draft?.number}</DialogTitle>
          </DialogHeader>

          {draft && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Input value={draft.customer?.name || ""} onChange={(e) => setDraft((p) => (p ? { ...p, customer: { ...p.customer, name: e.target.value } } : p))} />
                </div>
                <div className="space-y-2">
                  <Label>CPF/CNPJ</Label>
                  <Input value={draft.customer?.cpfCnpj || ""} onChange={(e) => setDraft((p) => (p ? { ...p, customer: { ...p.customer, cpfCnpj: e.target.value } } : p))} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={draft.customer?.phone || ""} onChange={(e) => setDraft((p) => (p ? { ...p, customer: { ...p.customer, phone: e.target.value } } : p))} />
                </div>
                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Input value={draft.customer?.address || ""} onChange={(e) => setDraft((p) => (p ? { ...p, customer: { ...p.customer, address: e.target.value } } : p))} />
                </div>
              </div>

              <div className="space-y-3">
                <div className="font-semibold">Itens</div>
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="divide-y divide-border">
                    {draft.items.map((it) => (
                      <div key={it.id} className="p-3 grid grid-cols-1 sm:grid-cols-5 gap-3 items-center">
                        <div className="sm:col-span-2">
                          <div className="font-medium">{it.product.name}</div>
                          <div className="text-xs text-muted-foreground">{it.product.unit}</div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Qtd</Label>
                          <Input
                            type="number"
                            value={it.quantity}
                            onChange={(e) => {
                              const q = Number(e.target.value) || 0;
                              setDraft((prev) => {
                                if (!prev) return prev;
                                const items = prev.items.map((x) => (x.id === it.id ? { ...x, quantity: q, subtotal: q * (x.unitPrice || 0) } : x));
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
                              setDraft((prev) => {
                                if (!prev) return prev;
                                const items = prev.items.map((x) => (x.id === it.id ? { ...x, unitPrice: p, subtotal: p * (x.quantity || 0) } : x));
                                return { ...prev, items };
                              });
                            }}
                          />
                        </div>
                        <div className="text-right font-semibold">{formatCurrency(it.subtotal || it.unitPrice * it.quantity)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Frete (R$)</Label>
                  <Input type="number" value={draft.freight || 0} onChange={(e) => setDraft((p) => (p ? { ...p, freight: Number(e.target.value) || 0 } : p))} />
                </div>
                <div className="space-y-2">
                  <Label>Desconto (R$)</Label>
                  <Input type="number" value={draft.discount || 0} onChange={(e) => setDraft((p) => (p ? { ...p, discount: Number(e.target.value) || 0 } : p))} />
                </div>
                <div className="space-y-2">
                  <Label>Validade</Label>
                  <Input value={draft.validity || ""} onChange={(e) => setDraft((p) => (p ? { ...p, validity: e.target.value } : p))} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea rows={4} value={draft.observations || ""} onChange={(e) => setDraft((p) => (p ? { ...p, observations: e.target.value } : p))} />
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(draft.items.reduce((acc, it) => acc + (it.subtotal || it.unitPrice * it.quantity), 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total</span>
                  <span className="font-bold">
                    {formatCurrency(
                      draft.items.reduce((acc, it) => acc + (it.subtotal || it.unitPrice * it.quantity), 0) - (draft.discount || 0) + (draft.freight || 0),
                    )}
                  </span>
                </div>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button onClick={saveDraft}>Salvar alterações</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
