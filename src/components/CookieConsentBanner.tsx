import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useVisitorTracker } from "@/hooks/useVisitorTracker";

export function CookieConsentBanner() {
  const tracker = useVisitorTracker();
  const [configOpen, setConfigOpen] = useState(false);

  if (tracker.consent !== "unknown") return null;

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4">
        <Card className="mx-auto max-w-4xl rounded-2xl border border-border bg-background/80 supports-[backdrop-filter]:bg-background/70 backdrop-blur-xl shadow-xl">
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="min-w-0">
              <div className="font-semibold">Cookies & privacidade</div>
              <div className="text-sm text-muted-foreground">
                Usamos cookies para melhorar a experiência e medir performance. Você pode aceitar ou configurar.
              </div>
            </div>
            <div className="flex gap-2 sm:justify-end sm:ml-auto">
              <Button variant="outline" className="rounded-xl" onClick={() => setConfigOpen(true)}>
                Configurar
              </Button>
              <Button className="rounded-xl" onClick={() => tracker.accept()}>
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
                Permite registrar navegação, produtos vistos e interações para melhorar atendimento.
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" className="rounded-xl" onClick={() => { tracker.decline(); setConfigOpen(false); }}>
                Recusar
              </Button>
              <Button className="rounded-xl" onClick={() => { tracker.accept(); setConfigOpen(false); }}>
                Aceitar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
