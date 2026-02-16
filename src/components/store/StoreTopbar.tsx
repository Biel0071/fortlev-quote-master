import { Link } from "react-router-dom";
import { ShoppingCart, Shield, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export function StoreTopbar({
  cartCount,
  onCartClick,
}: {
  cartCount: number;
  onCartClick?: () => void;
}) {
  const { isAdmin } = useIsAdmin();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        <Link to="/" className="font-semibold tracking-tight">
          Materiais de Construção
        </Link>

        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/loja">Loja</Link>
          </Button>

          <Button asChild variant="ghost" size="sm">
            <Link to="/p/politica-de-privacidade" className="gap-2">
              <Info className="h-4 w-4" />
              <span className="hidden sm:inline">Institucional</span>
            </Link>
          </Button>

          {onCartClick ? (
            <Button variant="ghost" size="sm" className="gap-2" onClick={onCartClick}>
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Carrinho</span>
              {cartCount > 0 && (
                <span className="ml-1 rounded-full bg-accent text-accent-foreground px-2 py-0.5 text-xs font-semibold">
                  {cartCount}
                </span>
              )}
            </Button>
          ) : (
            <Button asChild variant="ghost" size="sm">
              <Link to="/carrinho" className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline">Carrinho</span>
                {cartCount > 0 && (
                  <span className="ml-1 rounded-full bg-accent text-accent-foreground px-2 py-0.5 text-xs font-semibold">
                    {cartCount}
                  </span>
                )}
              </Link>
            </Button>
          )}

          {isAdmin && (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/admin">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
