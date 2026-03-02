import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  name: string;
  phone: string;
  loading: boolean;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onContinue: () => void;
};

export function CheckoutIdentifyStep({
  name,
  phone,
  loading,
  onNameChange,
  onPhoneChange,
  onContinue,
}: Props) {
  return (
    <Card className="mx-auto max-w-xl rounded-2xl">
      <CardHeader>
        <CardTitle className="text-2xl tracking-tight">Checkout</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="checkout-name">Nome</Label>
          <Input
            id="checkout-name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            autoComplete="name"
            maxLength={120}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="checkout-phone">WhatsApp</Label>
          <Input
            id="checkout-phone"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="(DDD) 9xxxx-xxxx"
            autoComplete="tel"
            inputMode="tel"
            maxLength={20}
          />
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={onContinue} disabled={loading}>
            {loading ? "Processando..." : "Continuar"}
          </Button>
          <Button asChild variant="outline">
            <Link to="/carrinho">Voltar ao carrinho</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
