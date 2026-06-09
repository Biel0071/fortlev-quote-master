import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  ExternalLink, 
  FileText, 
  Package, 
  Settings, 
  Sparkles, 
  Smartphone,
  CheckCircle2,
  Terminal,
  Store
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export const ProjectTestingGuide = () => {
  const navigate = useNavigate();

  const testPaths = [
    {
      title: "Loja & Catálogo",
      description: "Teste a vitrine de produtos, carrinho e finalização de pedido.",
      url: "/",
      icon: Store,
      actionLabel: "Abrir Loja",
      isExternal: false
    },
    {
      title: "Orçamentos (PDF/PNG)",
      description: "Gere orçamentos profissionais, notas térmicas e PNGs de venda.",
      url: "/admin/orcamentos",
      icon: FileText,
      actionLabel: "Gerenciar Orçamentos"
    },
    {
      title: "Relatório & Download",
      description: "Baixe o código-fonte analisado e o resumo técnico do sistema.",
      url: "/admin/inteligencia-ia",
      icon: Download,
      actionLabel: "Baixar Sistema (.zip)",
      note: "Vá na aba 'Relatórios'"
    },
    {
      title: "Produtos & Cadastro",
      description: "Gerencie o estoque, categorias e configurações multi-tenant.",
      url: "/admin/produtos",
      icon: Package,
      actionLabel: "Ver Produtos"
    }
  ];

  return (
    <Card className="rounded-2xl border-primary/20 shadow-lg overflow-hidden">
      <CardHeader className="bg-primary/5 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            Guia de Testes do Sistema
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-semibold text-green-600 uppercase tracking-wider">Sistema Online</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {testPaths.map((path) => (
            <div 
              key={path.title} 
              className="group p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <path.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold">{path.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 mb-3 line-clamp-2">
                    {path.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="default" 
                      className="h-8 text-xs px-3 rounded-lg gap-1.5"
                      onClick={() => navigate(path.url)}
                    >
                      {path.actionLabel}
                      {path.url === "/" ? <ExternalLink className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
                    </Button>
                    {path.note && (
                      <span className="text-[10px] text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
                        {path.note}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-xl bg-muted/50 border border-dashed border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/20">
              <Smartphone className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold">Teste o App Mobile (APK)</p>
              <p className="text-[10px] text-muted-foreground">O link de download público pode ser gerado nas configurações.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg" onClick={() => navigate("/admin/configuracoes/integracoes")}>
            Ver Configurações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const ArrowRight = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);
