import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Shield, Info, Store as StoreIcon, User, Search, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useStoreContact } from "@/hooks/useStoreContact";

export function StoreTopbar({
  cartCount,
  onCartClick,
}: {
  cartCount: number;
  onCartClick?: () => void;
}) {
  const { isAdmin } = useIsAdmin();
  const nav = useNavigate();
  const contact = useStoreContact();

  const [q, setQ] = useState("");

  const submitSearch = () => {
    const term = q.trim();
    nav(term ? `/loja?q=${encodeURIComponent(term)}` : "/loja");
  };

  const waHref = useMemo(() => contact.waLink, [contact.waLink]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-3">
        {/* Logo / Nome */}
        <Link to="/" className="font-semibold tracking-tight whitespace-nowrap">
          Depósito
        </Link>

        {/* Busca central */}
        <div className="flex-1 min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar produtos..."
              className="pl-9"
              aria-label="Buscar produtos"
              onKeyDown={(e) => {
                if (e.key === "Enter") submitSearch();
              }}
            />
          </div>
        </div>

        {/* Ações */}
        <nav className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" aria-label="Ir para lojas">
            <Link to="/loja">
              <StoreIcon className="h-4 w-4" />
            </Link>
          </Button>

          <Button asChild variant="ghost" size="icon" aria-label="Minha conta">
            <Link to="/auth/login">
              <User className="h-4 w-4" />
            </Link>
          </Button>

          <Button asChild variant="ghost" size="icon" aria-label="Institucional">
            <Link to="/p/politica-de-privacidade">
              <Info className="h-4 w-4" />
            </Link>
          </Button>

          <Button asChild variant="ghost" size="icon" aria-label="Chamar no WhatsApp" disabled={!waHref}>
            <a href={waHref || "#"} target="_blank" rel="noreferrer">
              <MessageCircle className="h-4 w-4" />
            </a>
          </Button>

          {onCartClick ? (
            <Button variant="ghost" size="icon" onClick={onCartClick} aria-label="Abrir carrinho">
              <ShoppingCart className="h-4 w-4" />
              {cartCount > 0 && (
                <span className="ml-1 rounded-full bg-accent text-accent-foreground px-2 py-0.5 text-xs font-semibold">
                  {cartCount}
                </span>
              )}
            </Button>
          ) : (
            <Button asChild variant="ghost" size="icon" aria-label="Ver carrinho">
              <Link to="/carrinho">
                <ShoppingCart className="h-4 w-4" />
                {cartCount > 0 && (
                  <span className="ml-1 rounded-full bg-accent text-accent-foreground px-2 py-0.5 text-xs font-semibold">
                    {cartCount}
                  </span>
                )}
              </Link>
            </Button>
          )}

          {isAdmin && (
            <Button asChild variant="outline" size="icon" aria-label="Admin">
              <Link to="/admin">
                <Shield className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
