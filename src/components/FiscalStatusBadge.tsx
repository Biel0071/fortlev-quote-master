import { Badge } from "@/components/ui/badge";
import { FiscalStatus } from "@/types/quotation";
import { CheckCircle2, Clock, XCircle, AlertTriangle, FileText } from "lucide-react";

interface FiscalStatusBadgeProps {
  status?: FiscalStatus;
  className?: string;
}

export const FiscalStatusBadge = ({ status, className }: FiscalStatusBadgeProps) => {
  if (!status) return null;

  const config = {
    autorizada: {
      label: "Autorizada na SEFAZ",
      variant: "default" as const,
      className: "bg-green-600 hover:bg-green-700 text-white border-none",
      icon: <CheckCircle2 className="h-3 w-3 mr-1" />
    },
    autorizada_fora_prazo: {
      label: "Autorizada fora do prazo",
      variant: "secondary" as const,
      className: "bg-blue-600 hover:bg-blue-700 text-white border-none",
      icon: <CheckCircle2 className="h-3 w-3 mr-1" />
    },
    em_processamento: {
      label: "Em processamento",
      variant: "outline" as const,
      className: "text-blue-600 border-blue-600",
      icon: <Clock className="h-3 w-3 mr-1 animate-pulse" />
    },
    cancelada: {
      label: "Nota Cancelada",
      variant: "destructive" as const,
      className: "bg-red-600 hover:bg-red-700 text-white border-none",
      icon: <XCircle className="h-3 w-3 mr-1" />
    },
    rejeitada: {
      label: "Nota Rejeitada",
      variant: "destructive" as const,
      className: "bg-orange-600 hover:bg-orange-700 text-white border-none",
      icon: <AlertTriangle className="h-3 w-3 mr-1" />
    },
    indisponivel: {
      label: "Fiscal Indisponível",
      variant: "secondary" as const,
      className: "bg-gray-600 hover:bg-gray-700 text-white border-none",
      icon: <AlertTriangle className="h-3 w-3 mr-1" />
    },
    pre_visualizacao_sem_validade_fiscal: {
      label: "Prévia sem valor fiscal",
      variant: "outline" as const,
      className: "text-gray-500 border-gray-400 border-dashed",
      icon: <FileText className="h-3 w-3 mr-1" />
    }
  };

  const current = config[status] || config.pre_visualizacao_sem_validade_fiscal;

  return (
    <Badge 
      variant={current.variant} 
      className={`${current.className} flex items-center px-2 py-0.5 whitespace-nowrap ${className}`}
    >
      {current.icon}
      {current.label}
    </Badge>
  );
};
