import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function StoreMobileBottomNav({
  cartCount,
  onCartClick,
}: {
  cartCount: number;
  onCartClick?: () => void;
}) {
  const nav = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === "/";
  const isCart = location.pathname === "/carrinho";

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 md:hidden",
        "border-t border-border bg-background/80 backdrop-blur",
      )}
      role="navigation"
      aria-label="Navegação"
    >
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-around">
        <Button asChild variant={isHome ? "default" : "ghost"} size="sm" className="gap-2">
          <Link to="/">
            <Home className="h-4 w-4" />
            <span>Home</span>
          </Link>
        </Button>

        <Button
          variant={isCart ? "default" : "ghost"}
          size="sm"
          className="gap-2"
          onClick={() => {
            if (onCartClick) onCartClick();
            else nav("/carrinho");
          }}
        >
          <ShoppingCart className="h-4 w-4" />
          <span>Carrinho</span>
          {cartCount > 0 && (
            <span className="ml-1 rounded-full bg-accent text-accent-foreground px-2 py-0.5 text-xs font-semibold">
              {cartCount}
            </span>
          )}
        </Button>
      </div>
    </nav>
  );
}
