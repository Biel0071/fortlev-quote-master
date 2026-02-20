import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, Truck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useHomeContent } from "@/hooks/useHomeContent";
import storeLogo from "@/assets/store-logo-materiais.png";

export function StoreTopbar({
  cartCount,
  onCartClick,
}: {
  cartCount: number;
  onCartClick?: () => void;
}) {
  const nav = useNavigate();
  const { footer } = useHomeContent();

  const [q, setQ] = useState("");

  const submitSearch = () => {
    const term = q.trim();
    nav(term ? `/loja?q=${encodeURIComponent(term)}` : "/loja");
  };

  const brandLabel = footer?.store_name || "Materiais de Construção";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-col gap-3">
          {/* Logo centralizada */}
          <div className="flex items-center justify-center">
            <Link to="/materiais" className="flex flex-col items-center gap-1">
              <img src={storeLogo} alt={`${brandLabel} - logo`} className="h-10 w-10 rounded-lg" loading="eager" />
              <span className="text-xs text-muted-foreground truncate max-w-[70vw]">{brandLabel}</span>
            </Link>
          </div>

          {/* Busca + Ações */}
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar produtos..."
                  className="pl-9 h-11 w-full"
                  aria-label="Buscar produtos"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitSearch();
                  }}
                />
              </div>
            </div>

            <nav className="flex items-center gap-1 shrink-0">
              <Button asChild variant="ghost" size="icon" aria-label="Perfil">
                <Link to="/conta">
                  <User className="h-5 w-5" />
                </Link>
              </Button>

              <Button asChild variant="ghost" size="icon" aria-label="Rastreio">
                <Link to="/pedidos">
                  <Truck className="h-5 w-5" />
                </Link>
              </Button>

              {onCartClick ? (
                <Button variant="ghost" size="icon" onClick={onCartClick} aria-label="Carrinho" className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 rounded-full bg-promo text-promo-foreground px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                      {cartCount}
                    </span>
                  )}
                </Button>
              ) : (
                <Button asChild variant="ghost" size="icon" aria-label="Carrinho" className="relative">
                  <Link to="/carrinho">
                    <ShoppingCart className="h-5 w-5" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 rounded-full bg-promo text-promo-foreground px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                </Button>
              )}
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
