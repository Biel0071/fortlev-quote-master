import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AdminSettingsFrete() {
  return (
    <Card className="rounded-2xl">
      <CardHeader><CardTitle>Frete</CardTitle></CardHeader>
      <CardContent className="text-sm text-muted-foreground">Configurações de frete em breve.</CardContent>
    </Card>
  );
}

export function AdminSettingsPagamentos() {
  return (
    <Card className="rounded-2xl">
      <CardHeader><CardTitle>Pagamentos</CardTitle></CardHeader>
      <CardContent className="text-sm text-muted-foreground">Configurações de pagamento em breve.</CardContent>
    </Card>
  );
}

export function AdminSettingsIdentidade() {
  return (
    <Card className="rounded-2xl">
      <CardHeader><CardTitle>Identidade da Loja</CardTitle></CardHeader>
      <CardContent className="text-sm text-muted-foreground">Personalização da identidade em breve.</CardContent>
    </Card>
  );
}

export function AdminSettingsIntegracoes() {
  return (
    <Card className="rounded-2xl">
      <CardHeader><CardTitle>Integrações</CardTitle></CardHeader>
      <CardContent className="text-sm text-muted-foreground">Integrações com serviços externos em breve.</CardContent>
    </Card>
  );
}
