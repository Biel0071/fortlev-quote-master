import { Droplets } from 'lucide-react';

export const Header = () => {
  return (
    <header className="fortlev-gradient text-primary-foreground py-6 px-4 sm:px-6 shadow-lg">
      <div className="max-w-6xl mx-auto">
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
      </div>
    </header>
  );
};
