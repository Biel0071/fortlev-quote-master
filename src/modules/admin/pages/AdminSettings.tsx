import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminSettings() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Ajustes globais (em evolução).</p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Em breve</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Centralizaremos aqui: WhatsApp, limites de gateway, regras de frete, prazos e identidade.
        </CardContent>
      </Card>
    </div>
  );
}
