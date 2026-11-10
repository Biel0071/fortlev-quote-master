import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useVisitorTracker } from "@/hooks/useVisitorTracker";
import { cloud } from "@/lib/cloud";
import { trackClickEvent } from "@/utils/clickTracking";

async function logConsent(sessionToken: string, consent: "accepted" | "declined") {
  try {
    await cloud.functions.invoke("cookie-consent", {
      body: { session_token: sessionToken, consent },
    });
  } catch {
    // best-effort
  }
}

export function CookieConsentBanner() {
  const tracker = useVisitorTracker();
  const [configOpen, setConfigOpen] = useState(false);

  // Auto-ativar cookies básicos após 3s (se o usuário não interagir/recusar)
  useEffect(() => {
    if (tracker.consent !== "unknown") return;
    if (configOpen) return;

    const t = window.setTimeout(() => {
      accept("auto");
    }, 3000);

    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracker.consent, configOpen]);

  const accept = async (source: "user" | "auto") => {
    tracker.accept();
    await logConsent(tracker.sessionToken, "accepted");
    trackClickEvent({ sessionToken: tracker.sessionToken, type: "cookies_activated", metadata: { source } });
    toast({ title: "Cookies ativados", description: "Cookies ativados para melhorar sua experiência." });
  };

  const decline = async () => {
    tracker.decline();
    await logConsent(tracker.sessionToken, "declined");
  };

  // Não exibir popup de cookies nas telas administrativas, rotas curtas ou landing de downloads/myjadlog
  const pathname = typeof window !== "undefined" ? window.location.pathname.toLowerCase() : "";
  const isExcludedRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/downloads") ||
    pathname.startsWith("/r/") ||
    pathname === "/myjadlog" ||
    pathname === "/my_jadlog" ||
    pathname === "/my-jadlog";

  if (isExcludedRoute || tracker.consent !== "unknown") {
    return null;
  }

  return (
    <>
      <Card className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-xl p-4 shadow-lg sm:bottom-6 sm:left-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted-foreground sm:text-sm">
            <p className="font-medium text-foreground">Utilizamos cookies para melhorar sua experiência.</p>
            <p>
              Usamos cookies para funcionamento, segurança, personalização de conteúdo e análise de tráfego. Você pode aceitar para ativar todas as medições, ou configurar suas preferências.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            <Button variant="outline" size="sm" onClick={() => setConfigOpen(true)}>
              Configurar
            </Button>
            <Button size="sm" onClick={() => accept("user")}>
              Aceitar
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Preferências de Cookies</DialogTitle>
            <DialogDescription>
              Escolha quais categorias de cookies você deseja permitir. Cookies necessários não podem ser desativados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
              <div>
                <p className="font-medium">Necessários</p>
                <p className="text-xs text-muted-foreground">Essenciais para login, segurança e carrinho. Sempre ativos.</p>
              </div>
              <span className="text-xs font-semibold text-muted-foreground">Sempre ativo</span>
            </div>

            <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
              <div>
                <p className="font-medium">Análise de Tráfego e Cliques</p>
                <p className="text-xs text-muted-foreground">Ajuda a entender como os visitantes usam o site (mapa de cliques, funis).</p>
              </div>
              <span className="text-xs font-semibold text-primary">Ativo</span>
            </div>

            <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
              <div>
                <p className="font-medium">Personalização e Ofertas</p>
                <p className="text-xs text-muted-foreground">Permite exibir cupons e recomendações personalizadas.</p>
              </div>
              <span className="text-xs font-semibold text-primary">Ativo</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={decline}>
              Recusar Opcionais
            </Button>
            <Button size="sm" onClick={() => { accept("user"); setConfigOpen(false); }}>
              Salvar Preferências
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
