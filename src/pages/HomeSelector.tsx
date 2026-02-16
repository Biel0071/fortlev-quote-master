import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Store as StoreIcon, Droplets, Building2 } from "lucide-react";

export default function HomeSelector() {
  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Escolha a loja</h1>
          <p className="text-sm text-muted-foreground">
            Acesse a vitrine de Materiais ou gere orçamentos Fortlev com atendimento via WhatsApp.
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <StoreIcon className="h-5 w-5" />
                Materiais de Construção
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Vitrine completa com categorias, ofertas, carrinho e checkout.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link to="/materiais">Abrir vitrine</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/construcao">Gerar orçamento (Materiais)</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplets className="h-5 w-5" />
                Home Completa Fortlev
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Geração de orçamentos para caixas d’água com foco em atendimento no WhatsApp.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link to="/orcamentos">Gerar orçamento Fortlev</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/orcamentos">Atendimento no WhatsApp</Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link to="/dashboard/fortlev">Ver dashboard</Link>
                </Button>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MessageCircle className="h-4 w-4" />
                Você pode ajustar o WhatsApp da loja no conteúdo do rodapé (admin).
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Dica rápida
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Se você for administrador, acesse <Link className="underline" to="/admin">/admin</Link> para gerenciar vitrine,
              banners e conteúdo.
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
