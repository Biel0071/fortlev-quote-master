import { Download, MessageCircle, CheckCircle2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apkUrl: string | null;
  whatsappLink: string;
  onTrack: (event: string) => void;
}

export function AppDownloadConfirmDialog({
  open,
  onOpenChange,
  apkUrl,
  whatsappLink,
  onTrack,
}: Props) {
  const handleWhatsApp = () => {
    onTrack("app_popup_confirm_whatsapp");
    const msg = encodeURIComponent(
      "Quero 10% OFF - instalei (ou estou instalando) o aplicativo."
    );
    const url = `${whatsappLink}?text=${msg}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleContinueDownload = () => {
    onTrack("app_download_continue");
    if (apkUrl) window.open(apkUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92vw] sm:max-w-md rounded-2xl p-5">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-center leading-tight">
            Confirme sua instalação e ative 10% OFF
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground text-center mt-1">
          Após instalar o app, confirme no WhatsApp para liberar seu cupom de
          10% OFF.
        </p>

        <ul className="mt-4 space-y-2.5 text-sm">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
            <span>Baixe e instale o app</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
            <span>Toque em "Confirmar no WhatsApp"</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
            <span>Envie a mensagem automática para validação</span>
          </li>
        </ul>

        <div className="mt-5 flex flex-col gap-2.5">
          <Button
            onClick={handleWhatsApp}
            className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2"
          >
            <MessageCircle className="h-5 w-5" />
            Confirmar no WhatsApp
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              onTrack("app_popup_already_installing");
              onOpenChange(false);
            }}
            className="h-11 rounded-xl font-medium"
          >
            Já estou instalando
          </Button>

          <button
            type="button"
            onClick={handleContinueDownload}
            className="text-xs text-primary underline underline-offset-4 mx-auto py-1"
          >
            Continuar download
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
