import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  cep: string;
  address: string;
  number: string;
  complement: string;
  notes: string;
  loadingCep: boolean;
  loadingFinish: boolean;
  onCepChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onNumberChange: (value: string) => void;
  onComplementChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onFetchCep: () => void;
  onBack: () => void;
  onFinish: () => void;
};

export function CheckoutDeliveryStep({
  cep,
  address,
  number,
  complement,
  notes,
  loadingCep,
  loadingFinish,
  onCepChange,
  onAddressChange,
  onNumberChange,
  onComplementChange,
  onNotesChange,
  onFetchCep,
  onBack,
  onFinish,
}: Props) {
  return (
    <Card className="mx-auto max-w-2xl rounded-2xl border-border/80 shadow-sm">
      <CardHeader className="space-y-2 pb-3">
        <CardTitle className="text-2xl tracking-tight">Finalizar sua compra</CardTitle>
        <p className="text-sm text-muted-foreground">Preencha os dados de entrega para concluir seu pedido.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="checkout-cep">CEP</Label>
          <div className="flex gap-2">
            <Input
              id="checkout-cep"
              value={cep}
              onChange={(e) => onCepChange(e.target.value)}
              placeholder="00000-000"
              inputMode="numeric"
              maxLength={9}
              className="h-11 rounded-xl"
            />
            <Button variant="outline" onClick={onFetchCep} disabled={loadingCep} className="h-11 rounded-xl px-5">
              {loadingCep ? "Buscando..." : "Buscar"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="checkout-address">Endereço</Label>
          <Input
            id="checkout-address"
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            maxLength={255}
            className="h-11 rounded-xl"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="checkout-number">Número</Label>
            <Input
              id="checkout-number"
              value={number}
              onChange={(e) => onNumberChange(e.target.value)}
              maxLength={20}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="checkout-complement">Complemento</Label>
            <Input
              id="checkout-complement"
              value={complement}
              onChange={(e) => onComplementChange(e.target.value)}
              maxLength={255}
              className="h-11 rounded-xl"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="checkout-notes">Observações</Label>
          <Textarea
            id="checkout-notes"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Ex.: entregar no portão"
            maxLength={1000}
            className="min-h-24 rounded-xl"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <Button variant="outline" onClick={onBack} className="h-11 rounded-xl sm:flex-1">
            Voltar
          </Button>
          <Button onClick={onFinish} disabled={loadingFinish} className="h-11 rounded-xl sm:flex-1">
            {loadingFinish ? "Processando..." : "Finalizar pedido"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
