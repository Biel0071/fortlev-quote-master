import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft } from "lucide-react";

interface Props {
  title: string;
  description: string;
}

export default function PaymentDevPlaceholder({ title, description }: Props) {
  const nav = useNavigate();
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
      <div className="rounded-lg border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-amber-700 dark:text-amber-400">Esta funcionalidade está em desenvolvimento.</p>
          <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">Em breve estará disponível.</p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={() => nav(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>
    </div>
  );
}
