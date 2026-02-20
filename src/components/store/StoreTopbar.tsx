import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MoreVertical, PackageSearch, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
          {/* Logo centralizada (apenas logo) */}
          <div className="flex items-center justify-center">
            <Link to="/materiais" className="flex items-center justify-center">
              <img
                src={storeLogo}
                alt={`${brandLabel} - logo`}
                className="h-10 w-10 rounded-lg"
                loading="eager"
              />
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
                  <PackageSearch className="h-5 w-5" />
                </Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Mais opções">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-50 w-56">
                  <DropdownMenuLabel>Opções</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/conta">Minha conta</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/pedidos">Meus pedidos / Rastreio</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/carrinho">Carrinho{cartCount > 0 ? ` (${cartCount})` : ""}</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
