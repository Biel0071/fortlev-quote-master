import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  User,
  Search,
  Package,
  Bot,
  MoreVertical,
  Tag,
  Flame,
  BadgePercent,
  Phone,
  Truck,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStoreCategories } from "@/hooks/useStoreCategories";
import { useHomeContent } from "@/hooks/useHomeContent";
import { useStoreContact } from "@/hooks/useStoreContact";
import storeLogo from "@/assets/store-logo-materiais.png";

export function StoreTopbar({
  cartCount,
  onCartClick,
}: {
  cartCount: number;
  onCartClick?: () => void;
}) {
  const nav = useNavigate();
  const { activeCategories } = useStoreCategories();
  const contact = useStoreContact();
  const { footer } = useHomeContent();

  const [q, setQ] = useState("");

  const submitSearch = () => {
    const term = q.trim();
    nav(term ? `/loja?q=${encodeURIComponent(term)}` : "/loja");
  };

  const waHref = useMemo(() => contact.waLink, [contact.waLink]);
  const brandLabel = footer?.store_name || "Materiais de Construção";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
        {/* Esquerda: Logo + Nome */}
        <Link to="/materiais" className="flex items-center gap-2 min-w-0">
          <img
            src={storeLogo}
            alt={`${brandLabel} - logo`}
            className="h-9 w-9 shrink-0 rounded-lg"
            loading="eager"
          />
          <div className="min-w-0 leading-tight hidden sm:block">
            <div className="font-semibold tracking-tight truncate max-w-[14rem]">{brandLabel}</div>
            <div className="text-xs text-muted-foreground truncate">Compre rápido • Entrega • Retire na loja</div>
          </div>
        </Link>

        {/* Centro: Busca grande */}
        <div className="flex-1 min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar produtos..."
              className="pl-9 h-11"
              aria-label="Buscar produtos"
              onKeyDown={(e) => {
                if (e.key === "Enter") submitSearch();
              }}
            />
          </div>
        </div>

        {/* Direita: ícones */}
        <nav className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" aria-label="Conta">
            <Link to="/conta">
              <User className="h-5 w-5" />
            </Link>
          </Button>

          <Button asChild variant="ghost" size="icon" aria-label="Pedidos">
            <Link to="/pedidos">
              <Package className="h-5 w-5" />
            </Link>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Chat"
            onClick={() => window.dispatchEvent(new CustomEvent("store:chat-open"))}
          >
            <Bot className="h-5 w-5" />
          </Button>

          {onCartClick ? (
            <Button variant="ghost" size="icon" onClick={onCartClick} aria-label="Carrinho">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="ml-1 rounded-full bg-promo text-promo-foreground px-2 py-0.5 text-xs font-semibold">
                  {cartCount}
                </span>
              )}
            </Button>
          ) : (
            <Button asChild variant="ghost" size="icon" aria-label="Carrinho">
              <Link to="/carrinho">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="ml-1 rounded-full bg-promo text-promo-foreground px-2 py-0.5 text-xs font-semibold">
                    {cartCount}
                  </span>
                )}
              </Link>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Mais">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Explorar</DropdownMenuLabel>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Tag className="mr-2 h-4 w-4" />
                  Categorias
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="max-h-[60vh] overflow-auto">
                  {activeCategories.slice(0, 40).map((c) => (
                    <DropdownMenuItem key={c.id} asChild>
                      <Link to={`/loja?categoria=${encodeURIComponent(c.slug)}`}>{c.name}</Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuItem asChild>
                <Link to="/loja?promo=1">
                  <BadgePercent className="mr-2 h-4 w-4" />
                  Ofertas
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link to="/loja?sort=popular">
                  <Flame className="mr-2 h-4 w-4" />
                  Mais vendidos
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>Ajuda</DropdownMenuLabel>

              <DropdownMenuItem asChild>
                <Link to="/institucional/entrega">
                  <Truck className="mr-2 h-4 w-4" />
                  Entrega
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link to="/institucional/politica">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Política
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild disabled={!waHref}>
                <a href={waHref || "#"} target="_blank" rel="noreferrer">
                  <Phone className="mr-2 h-4 w-4" />
                  Contato (WhatsApp)
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
}