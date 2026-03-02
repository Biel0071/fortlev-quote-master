import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  name: string;
  phone: string;
  phoneError?: string;
  loading: boolean;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onContinue: () => void;
};

export function CheckoutIdentifyStep({
  name,
  phone,
  phoneError,
  loading,
  onNameChange,
  onPhoneChange,
  onContinue,
}: Props) {
  return (
    <Card className="mx-auto max-w-xl rounded-2xl border-border/80 shadow-sm">
      <CardHeader className="space-y-2 pb-3">
        <CardTitle className="text-2xl tracking-tight">Finalizar sua compra</CardTitle>
        <p className="text-sm text-muted-foreground">Informe seus dados para continuar em menos de 1 minuto.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="checkout-name">Nome</Label>
          <Input
            id="checkout-name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            autoComplete="name"
            maxLength={120}
            className="h-11 rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="checkout-phone">WhatsApp</Label>
          <Input
            id="checkout-phone"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="(DDD) 9XXXX-XXXX"
            autoComplete="tel"
            inputMode="tel"
            maxLength={16}
            className="h-11 rounded-xl"
          />
          {phoneError ? <p className="text-sm text-destructive">{phoneError}</p> : null}
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <Button onClick={onContinue} disabled={loading} className="h-11 rounded-xl">
            {loading ? "Processando..." : "Continuar"}
          </Button>
          <Button asChild variant="outline" className="h-11 rounded-xl">
            <Link to="/carrinho">Voltar ao carrinho</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
