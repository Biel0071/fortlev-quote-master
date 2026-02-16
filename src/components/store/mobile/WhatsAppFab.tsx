import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function WhatsAppFab({ href, className }: { href: string; className?: string }) {
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn("fixed right-4 z-50", className)}
      aria-label="Chamar no WhatsApp"
    >
      <Button variant="whatsapp" size="icon" className="h-12 w-12 rounded-full shadow-lg">
        <MessageCircle className="h-5 w-5" />
      </Button>
    </a>
  );
}
