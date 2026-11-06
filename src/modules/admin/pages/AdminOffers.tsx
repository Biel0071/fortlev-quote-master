import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Flame, Plus, Trash2, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

type StoreProductMini = {
  id: string;
  name: string;
  price: number;
  promo_price?: number | null;
  unit: string | null;
  active: boolean;
};

type HomeOfferRow = {
  id: string;
  product_id: string;
  badge_text: string | null;
  promo_price: number | null;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  active: boolean;
};

export default function AdminOffers() {
  const { activeStoreId } = useStore();
  const [offers, setOffers] = useState<HomeOfferRow[]>([]);
  const [products, setProducts] = useState<StoreProductMini[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedProductId, setSelectedProductId] = useState("");
  const [promoPrice, setPromoPrice] = useState("");
  const [badgeText, setBadgeText] = useState("Oferta Imperdível");
  const [endsAt, setEndsAt] = useState("");

  async function loadData() {
    if (!activeStoreId) return;
    setLoading(true);
    const [offersRes, prodsRes] = await Promise.all([
      supabase
        .from("home_offers")
        .select("id, product_id, badge_text, promo_price, starts_at, ends_at, sort_order, active")
        .eq("store_id", activeStoreId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("store_products")
        .select("id, name, price, unit, active")
        .eq("store_id", activeStoreId)
        .eq("active", true)
        .order("name", { ascending: true })
        .limit(500),
    ]);

    setOffers((offersRes.data ?? []) as HomeOfferRow[]);
    setProducts((prodsRes.data ?? []) as StoreProductMini[]);
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, [activeStoreId]);

  const productById = useMemo(() => {
    const map = new Map<string, StoreProductMini>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  async function handleCreateOffer() {
    if (!activeStoreId || !selectedProductId) {
      toast({ title: "Selecione um produto", variant: "destructive" });
      return;
    }
    const parsedPrice = Number(promoPrice.replace(",", "."));
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      toast({ title: "Informe um preço promocional válido", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("home_offers").insert({
      store_id: activeStoreId,
      product_id: selectedProductId,
      promo_price: parsedPrice,
      badge_text: badgeText.trim() || null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      sort_order: offers.length + 1,
      active: true,
    });
    setSaving(false);

    if (error) {
      toast({ title: "Erro ao criar oferta", description: error.message, variant: "destructive" });
      return;
    }

    setSelectedProductId("");
    setPromoPrice("");
    setEndsAt("");
    toast({ title: "Oferta adicionada com sucesso" });
    void loadData();
  }

  async function handleToggleActive(offer: HomeOfferRow) {
    const { error } = await supabase
      .from("home_offers")
      .update({ active: !offer.active })
      .eq("id", offer.id);
    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      return;
    }
    void loadData();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("home_offers").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Oferta removida" });
    void loadData();
  }

  const fmtCurrency = (v: number | null | undefined) =>
    Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Flame className="h-6 w-6 text-destructive" />
            Gestão de Ofertas e Promoções
          </h1>
          <p className="text-sm text-muted-foreground">
            Destaque produtos em promoção na Home e na vitrine pública de Ofertas.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/ofertas" target="_blank">
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver Página de Ofertas
          </Link>
        </Button>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Adicionar Produto em Oferta</CardTitle>
          <CardDescription>
            Escolha um produto ativo do catálogo e defina o preço promocional e selo de destaque.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Produto</Label>
              <Select
                value={selectedProductId}
                onValueChange={(id) => {
                  setSelectedProductId(id);
                  const p = productById.get(id);
                  if (p && p.price > 0) {
                    setPromoPrice((Math.round(p.price * 0.85 * 100) / 100).toFixed(2));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto do catálogo..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {fmtCurrency(p.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Preço Promocional (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={promoPrice}
                onChange={(e) => setPromoPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Selo / Badge</Label>
              <Input
                value={badgeText}
                onChange={(e) => setBadgeText(e.target.value)}
                placeholder="Ex: Queima de Estoque"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2 w-full sm:w-64">
              <Label>Validade da Oferta (Opcional)</Label>
              <Input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
            <Button onClick={handleCreateOffer} disabled={saving || loading}>
              <Plus className="h-4 w-4 mr-2" />
              {saving ? "Salvando..." : "Publicar Oferta"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Ofertas Cadastradas ({offers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground py-6 text-center">Carregando ofertas...</div>
          ) : offers.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              Nenhuma oferta manual cadastrada em <code className="text-xs">home_offers</code>. A vitrine utiliza as ofertas automáticas do catálogo até que você adicione destaques personalizados acima.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Preço Original</TableHead>
                    <TableHead>Preço Oferta</TableHead>
                    <TableHead>Desconto</TableHead>
                    <TableHead>Selo</TableHead>
                    <TableHead>Ativa</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offers.map((offer) => {
                    const prod = productById.get(offer.product_id);
                    const orig = prod?.price ?? 0;
                    const promo = offer.promo_price ?? orig;
                    const pct = orig > 0 && promo < orig ? Math.round(((orig - promo) / orig) * 100) : 0;
                    return (
                      <TableRow key={offer.id}>
                        <TableCell className="font-medium">
                          {prod?.name ?? `Produto #${offer.product_id.slice(0, 8)}`}
                        </TableCell>
                        <TableCell className="text-muted-foreground line-through">
                          {orig > 0 ? fmtCurrency(orig) : "—"}
                        </TableCell>
                        <TableCell className="font-semibold text-primary">
                          {fmtCurrency(promo)}
                        </TableCell>
                        <TableCell>
                          {pct > 0 ? <Badge variant="destructive">-{pct}%</Badge> : "—"}
                        </TableCell>
                        <TableCell>
                          {offer.badge_text ? <Badge variant="secondary">{offer.badge_text}</Badge> : "—"}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={offer.active}
                            onCheckedChange={() => void handleToggleActive(offer)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => void handleDelete(offer.id)}
                            aria-label="Excluir oferta"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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
    </div>
  );
}
