import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Flame,
  Folder,
  MoreVertical,
  Package,
  PackageSearch,
  Search,
  ShoppingCart,
  Tag,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useHomeContent } from "@/hooks/useHomeContent";
import { useStoreCategories } from "@/hooks/useStoreCategories";
import { useStoreContact } from "@/hooks/useStoreContact";
import { FloatingChat } from "@/components/store/mobile/FloatingChat";
import { cn } from "@/lib/utils";
import storeLogo from "@/assets/store-logo-materiais.png";

export function StoreTopbar({
  cartCount,
  onCartClick,
  footerStoreName,
  categories,
}: {
  cartCount: number;
  onCartClick?: () => void;
  footerStoreName?: string;
  categories?: Array<{ id: string; name: string; slug: string }>;
}) {
  const nav = useNavigate();
  const { footer } = useHomeContent({ enabled: !footerStoreName });
  const { activeCategories } = useStoreCategories({ enabled: !categories });
  const contact = useStoreContact();

  const [q, setQ] = useState("");
  const [categoriesOpen, setCategoriesOpen] = useState(true);
  const [cartPulse, setCartPulse] = useState(false);
  const prevCartCountRef = useRef(cartCount);

  useEffect(() => {
    if (cartCount > prevCartCountRef.current) {
      setCartPulse(true);
      const t = window.setTimeout(() => setCartPulse(false), 420);
      prevCartCountRef.current = cartCount;
      return () => window.clearTimeout(t);
    }
    prevCartCountRef.current = cartCount;
  }, [cartCount]);

  const submitSearch = () => {
    const term = q.trim();
    nav(term ? `/loja?q=${encodeURIComponent(term)}` : "/loja");
  };

  const brandLabel = footerStoreName || footer?.store_name || "Materiais de Construção";
  const menuCategories = useMemo(
    () => ((categories?.length ? categories : activeCategories) ?? []).slice(0, 12),
    [categories, activeCategories],
  );

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-border bg-background/95 backdrop-blur-md w-full overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-3 sm:px-6 pb-2 pt-2 sm:pb-3 sm:pt-3">
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <div className="flex items-center justify-center">
              <Link to="/materiais" className="flex items-center justify-center" aria-label={brandLabel}>
                <img
                  src={storeLogo}
                  alt={`${brandLabel} - logo`}
                  className="h-[80px] w-[80px] sm:h-[100px] sm:w-[100px] object-contain"
                  loading="eager"
                />
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar..."
                    className="h-10 w-full rounded-2xl pl-10 text-sm"
                    aria-label="Buscar produtos"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitSearch();
                    }}
                  />
                </div>
              </div>

              <nav className="shrink-0 flex items-center gap-1" aria-label="Ações rápidas">
                <Button asChild variant="ghost" size="icon" className="h-11 w-11 rounded-xl" aria-label="Perfil">
                  <Link to="/conta">
                    <User className="h-5 w-5" />
                  </Link>
                </Button>

                <Button asChild variant="ghost" size="icon" className="h-11 w-11 rounded-xl" aria-label="Pedidos e rastreio">
                  <Link to="/pedidos">
                    <PackageSearch className="h-5 w-5" />
                  </Link>
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("relative h-11 w-11 rounded-xl transition-transform", cartPulse && "animate-bounce")}
                  aria-label={`Carrinho${cartCount > 0 ? ` com ${cartCount} itens` : ""}`}
                  onClick={() => {
                    if (onCartClick) {
                      onCartClick();
                      return;
                    }
                    nav("/carrinho");
                  }}
                >
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 ? (
                    <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                      {cartCount}
                    </span>
                  ) : null}
                </Button>

                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl" aria-label="Mais opções">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>

                  <SheetContent side="right" className="w-[22rem] bg-background/95 px-5 backdrop-blur-xl sm:w-[24rem]">
                    <SheetHeader className="space-y-2">
                      <SheetTitle className="text-lg tracking-tight">Acesso rápido</SheetTitle>
                      <SheetDescription>Navegue pela loja com mais agilidade.</SheetDescription>
                    </SheetHeader>

                    <div className="mt-6 space-y-4">
                      <section className="rounded-2xl border border-border/70 bg-muted/25 p-4 space-y-3">
                        <div className="text-sm font-semibold text-foreground">Atalhos da loja</div>
                        <div className="grid gap-2">
                          <Button asChild variant="outline" className="h-11 justify-start rounded-xl transition-all hover:translate-x-0.5">
                            <Link to="/materiais#ofertas" className="flex items-center gap-2">
                              <Tag className="h-[18px] w-[18px]" />
                              <span>Ofertas</span>
                            </Link>
                          </Button>
                          <Button asChild variant="outline" className="h-11 justify-start rounded-xl transition-all hover:translate-x-0.5">
                            <Link to="/materiais#mais-vendidos" className="flex items-center gap-2">
                              <Flame className="h-[18px] w-[18px]" />
                              <span>Mais vendidos</span>
                            </Link>
                          </Button>
                        </div>
                      </section>

                      <Separator className="bg-border/60" />

                      <section className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                        <Collapsible open={categoriesOpen} onOpenChange={setCategoriesOpen}>
                          <CollapsibleTrigger asChild>
                            <button
                              type="button"
                              className="flex w-full items-center justify-between rounded-xl px-1 py-1 text-left transition-colors hover:bg-accent/60"
                            >
                              <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                <Folder className="h-[18px] w-[18px]" />
                                Categorias
                              </span>
                              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", categoriesOpen && "rotate-180")} />
                            </button>
                          </CollapsibleTrigger>

                          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                            {menuCategories.length > 0 ? (
                              <div className="mt-3 grid max-h-64 gap-1 overflow-auto pr-1">
                                {menuCategories.map((c) => (
                                  <Button key={c.id} asChild variant="ghost" className="h-10 justify-start rounded-xl">
                                    <Link to={`/loja?categoria=${encodeURIComponent(c.slug)}`}>{c.name}</Link>
                                  </Button>
                                ))}
                              </div>
                            ) : (
                              <div className="mt-3 text-sm text-muted-foreground">Carregando categorias...</div>
                            )}
                          </CollapsibleContent>
                        </Collapsible>
                      </section>

                      <Separator className="bg-border/60" />

                      <section className="rounded-2xl border border-border/70 bg-muted/25 p-4 space-y-3">
                        <div className="text-sm font-semibold text-foreground">Conta</div>
                        <div className="grid gap-2">
                          <Button asChild variant="secondary" className="h-11 justify-start rounded-xl">
                            <Link to="/conta" className="flex items-center gap-2">
                              <User className="h-[18px] w-[18px]" />
                              <span>Minha conta</span>
                            </Link>
                          </Button>
                          <Button asChild variant="secondary" className="h-11 justify-start rounded-xl">
                            <Link to="/pedidos" className="flex items-center gap-2">
                              <Package className="h-[18px] w-[18px]" />
                              <span>Meus pedidos / Rastreio</span>
                            </Link>
                          </Button>
                          <Button
                            variant="secondary"
                            className="h-11 justify-start rounded-xl"
                            onClick={() => {
                              if (onCartClick) {
                                onCartClick();
                                return;
                              }
                              nav("/carrinho");
                            }}
                          >
                            <span className="flex items-center gap-2">
                              <ShoppingCart className="h-[18px] w-[18px]" />
                              <span>Carrinho{cartCount > 0 ? ` (${cartCount})` : ""}</span>
                            </span>
                          </Button>
                        </div>
                      </section>
                    </div>
                  </SheetContent>
                </Sheet>
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Spacer to offset fixed header */}
      <div className="h-[170px] sm:h-[190px] w-full shrink-0" aria-hidden="true" />

      <FloatingChat phoneDigits={contact.phoneDigits} />
    </>
  );
}
