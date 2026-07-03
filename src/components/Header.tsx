import { Building2, ArrowLeft } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import fortlevLogo from '@/assets/fortlev-logo.png';

export const Header = () => {
  const location = useLocation();
  const isConstruction = location.pathname === '/construcao';
  const returnPath = isConstruction ? '/admin/orcamentos/construcao' : '/admin/orcamentos/fortlev';
  const constructionPath = '/construcao';

  return (
    <header className="fortlev-gradient text-primary-foreground py-4 px-4 sm:px-6 shadow-lg">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src={fortlevLogo} alt="Fortlev" className="h-12 sm:h-14 w-auto object-contain" />
          </Link>

          <div className="flex items-center gap-2">
            <Link to={returnPath}>
              <Button variant="secondary" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Voltar ao Painel</span>
                <span className="sm:hidden">Voltar</span>
              </Button>
            </Link>
            {!isConstruction && (
              <Link to={constructionPath}>
                <Button variant="secondary" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Construção</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
