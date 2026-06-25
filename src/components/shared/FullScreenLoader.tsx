import { Loader2 } from "lucide-react";

interface FullScreenLoaderProps {
  label?: string;
}

/**
 * Full-screen loader to guarantee we never show a white screen during
 * tenant/route/data resolution. Lightweight, no external data deps.
 */
export function FullScreenLoader({ label = "Carregando..." }: FullScreenLoaderProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default FullScreenLoader;
