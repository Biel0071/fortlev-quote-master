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

  if (tracker.consent !== "unknown") return null;

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4">
        <Card className="mx-auto max-w-4xl rounded-2xl border border-border bg-background/80 supports-[backdrop-filter]:bg-background/70 backdrop-blur-xl shadow-xl">
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="min-w-0">
              <div className="font-semibold">Utilizamos cookies para melhorar sua experiência.</div>
              <div className="text-sm text-muted-foreground">
                Usamos cookies para funcionamento, segurança, personalização de conteúdo e análise de tráfego. Você pode aceitar para
                ativar melhorias e medições, ou configurar suas preferências.
              </div>
            </div>
            <div className="flex gap-2 sm:justify-end sm:ml-auto">
              <Button variant="outline" className="rounded-xl" onClick={() => setConfigOpen(true)}>
                Configurar
              </Button>
              <Button className="rounded-xl" onClick={() => accept("user")}>
                Aceitar
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Preferências de cookies</DialogTitle>
            <DialogDescription>
              Sem aceitação, não armazenamos IP nem eventos detalhados (apenas sessão temporária).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-border p-4">
              <div className="font-medium">Medição / Analytics</div>
              <div className="text-sm text-muted-foreground">
                Permite registrar navegação e interações para melhorar sua experiência.
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  decline();
                  setConfigOpen(false);
                }}
              >
                Recusar
              </Button>
              <Button
                className="rounded-xl"
                onClick={() => {
                  accept("user");
                  setConfigOpen(false);
                }}
              >
                Aceitar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

