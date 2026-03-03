import { Droplets, Building2, ArrowLeft } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export const Header = () => {
  const [searchParams] = useSearchParams();
  const isFromAdmin = searchParams.get('from') === 'admin';
  const constructionPath = isFromAdmin ? '/construcao?from=admin' : '/construcao';
  const returnPath = '/admin/dashboard/orcamentos';

  return (
    <header className="fortlev-gradient text-primary-foreground py-6 px-4 sm:px-6 shadow-lg">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-fortlev-yellow">
              <Droplets className="h-8 w-8 text-fortlev-navy" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight">
                FORTLEV
              </h1>
              <p className="text-sm text-primary-foreground/80">
                Sistema de Orçamentos • Caixas d'Água de Polietileno
              </p>
            </div>
          </div>

          {isFromAdmin ? (
            <Link to={returnPath}>
              <Button variant="secondary" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Voltar ao Dashboard</span>
              </Button>
            </Link>
          ) : (
            <Link to={constructionPath}>
              <Button 
                variant="secondary" 
                className="gap-2"
              >
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Materiais de Construção</span>
                <span className="sm:hidden">Construção</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
