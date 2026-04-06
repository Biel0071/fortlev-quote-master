import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Flame,
  Folder,
  Layers3,
  MoreVertical,
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
  SheetClose,
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
import areiaIcon from "@/assets/category-icons/areia.png";
import blocosIcon from "@/assets/category-icons/blocos.png";
import churrasqueiraIcon from "@/assets/category-icons/churrasqueira.png";
import cimentoIcon from "@/assets/category-icons/cimento.png";
import eletricaIcon from "@/assets/category-icons/eletrica.png";
import ferramentasIcon from "@/assets/category-icons/ferramentas.png";
import madeiraIcon from "@/assets/category-icons/madeira.png";
import pinturaIcon from "@/assets/category-icons/pintura.png";
import vergalhaoIcon from "@/assets/category-icons/vergalhao.png";

function resolveCategoryPng(name: string, slug?: string) {
  const key = `${slug ?? ""} ${name ?? ""}`.trim().toLowerCase();

  if (/(ferragem|vergalh|arma)/.test(key)) return vergalhaoIcon;
  if (/(cimento|argamassa|rejunte|massa|laje)/.test(key)) return cimentoIcon;
  if (/(bloco|tijolo|alvenaria|basic|material)/.test(key)) return blocosIcon;
  if (/(madeira|telhado|forro|porta|janela)/.test(key)) return madeiraIcon;
  if (/(elétrica|eletrica|fio|cabo|tomada|interruptor)/.test(key)) return eletricaIcon;
  if (/(ferramenta|obra|martelo|broca|serra|equip)/.test(key)) return ferramentasIcon;
  if (/(pintura|tinta|verniz|textura)/.test(key)) return pinturaIcon;
  if (/(churrasqueira|gourmet)/.test(key)) return churrasqueiraIcon;
  if (/(areia|brita|pedra|agregado|piso|porcelanato|revest)/.test(key)) return areiaIcon;

  return null;
}

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
  const location = useLocation();
  const { footer } = useHomeContent({ enabled: !footerStoreName });
  const { activeCategories } = useStoreCategories({ enabled: !categories });
  const contact = useStoreContact();

  const [q, setQ] = useState("");
  const [categoriesOpen, setCategoriesOpen] = useState(false);
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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setQ(params.get("q") ?? "");
  }, [location.search]);

  const submitSearch = () => {
    const term = q.trim();
    nav(term ? `/loja?q=${encodeURIComponent(term)}` : "/loja");
  };

  const brandLabel = footerStoreName || footer?.store_name || "Materiais de Construção";
  const menuCategories = useMemo(
    () => ((categories?.length ? categories : activeCategories) ?? []).slice(0, 12),
    [categories, activeCategories],
  );

  const showCatalogChips = location.pathname === "/loja";
  const selectedCategorySlug = useMemo(
    () => new URLSearchParams(location.search).get("categoria") ?? "all",
    [location.search],
  );
  const catalogChips = useMemo(
    () => [{ id: "all", name: "Todas", slug: "all" }, ...menuCategories],
    [menuCategories],
  );

  return (
    <>
      <header className="sticky top-0 z-40 w-full overflow-x-hidden border-b border-border bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/88">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-0 pb-0.5 sm:pt-3 sm:pb-3">
          <div className="flex flex-col gap-0.5 sm:gap-2.5">
            <div className="flex items-center justify-center">
              <Link to="/materiais" className="flex items-center justify-center" aria-label={brandLabel}>
                <img
                  src={storeLogo}
                  alt={`${brandLabel} - logo`}
                  className="h-[84px] w-[84px] sm:h-[88px] sm:w-[88px] object-contain"
                  loading="eager"
                />
              </Link>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <div className="min-w-0 flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar..."
                    className="h-11 w-full rounded-2xl pl-10 pr-3 text-sm"
                    aria-label="Buscar produtos"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitSearch();
                    }}
                  />
                </div>
              </div>

              <nav className="shrink-0 flex items-center gap-1" aria-label="Ações rápidas">
                <Button asChild variant="ghost" size="icon" className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl" aria-label="Pedidos e rastreio">
                  <Link to="/pedidos">
                    <PackageSearch className="h-5 w-5" />
                  </Link>
                </Button>

                <Button asChild variant="ghost" size="icon" className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl" aria-label="Perfil">
                  <Link to="/conta">
                    <User className="h-5 w-5" />
                  </Link>
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("hidden sm:flex relative h-11 w-11 rounded-xl transition-transform", cartPulse && "animate-bounce")}
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
                    <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl" aria-label="Mais opções">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>

                  <SheetContent side="right" className="w-[min(92vw,24rem)] bg-background/95 px-5 backdrop-blur-xl">
                    <SheetHeader className="space-y-2">
                      <SheetTitle className="text-lg tracking-tight">Acesso rápido</SheetTitle>
                      <SheetDescription>Navegue pela loja com mais agilidade.</SheetDescription>
                    </SheetHeader>

                    <div className="mt-6 space-y-4">
                      <section className="rounded-2xl border border-border/70 bg-muted/25 p-4 space-y-3">
                        <div className="text-sm font-semibold text-foreground">Atalhos da loja</div>
                        <div className="grid gap-2">
                          <SheetClose asChild>
                            <Button asChild variant="outline" className="h-11 justify-start rounded-xl transition-all hover:translate-x-0.5">
                              <Link to="/#destaques" className="flex items-center gap-2">
                                <Layers3 className="h-[18px] w-[18px]" />
                                <span>Destaques</span>
                              </Link>
                            </Button>
                          </SheetClose>
                          <SheetClose asChild>
                            <Button asChild variant="outline" className="h-11 justify-start rounded-xl transition-all hover:translate-x-0.5">
                              <Link to="/ofertas" className="flex items-center gap-2">
                                <Tag className="h-[18px] w-[18px]" />
                                <span>Ofertas</span>
                              </Link>
                            </Button>
                          </SheetClose>
                          <SheetClose asChild>
                            <Button asChild variant="outline" className="h-11 justify-start rounded-xl transition-all hover:translate-x-0.5">
                              <Link to="/#mais-vendidos" className="flex items-center gap-2">
                                <Flame className="h-[18px] w-[18px]" />
                                <span>Mais vendidos</span>
                              </Link>
                            </Button>
                          </SheetClose>
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
                              <div className="mt-3 grid max-h-64 gap-1 overflow-y-auto pr-1">
                                {menuCategories.map((c) => {
                                  const iconSrc = resolveCategoryPng(c.name, c.slug);
                                  return (
                                    <SheetClose asChild key={c.id}>
                                      <Button asChild variant="ghost" className="h-auto min-h-11 justify-start rounded-xl px-3 py-2">
                                        <Link to={`/loja?categoria=${encodeURIComponent(c.slug)}`} className="flex items-center gap-3">
                                          {iconSrc ? (
                                            <img src={iconSrc} alt="" className="h-6 w-6 shrink-0 object-contain" loading="lazy" aria-hidden="true" />
                                          ) : (
                                            <Folder className="h-5 w-5 shrink-0 text-primary" />
                                          )}
                                          <span className="truncate">{c.name}</span>
                                        </Link>
                                      </Button>
                                    </SheetClose>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="mt-3 text-sm text-muted-foreground">Carregando categorias...</div>
                            )}
                          </CollapsibleContent>
                        </Collapsible>
                      </section>
                    </div>
                  </SheetContent>
                </Sheet>
              </nav>
            </div>

            {showCatalogChips ? (
              <div className="-mx-1 px-1 overflow-x-auto pb-1 scrollbar-none" style={{ scrollbarWidth: "none" }}>
                <div className="flex w-max gap-2">
                  {catalogChips.map((category) => {
                    const active = category.slug === selectedCategorySlug;
                    const href = category.slug === "all" ? "/loja" : `/loja?categoria=${encodeURIComponent(category.slug)}`;

                    return (
                      <Link
                        key={category.id}
                        to={href}
                        className={cn(
                          "shrink-0 rounded-full px-3.5 py-2 text-xs font-medium whitespace-nowrap transition-colors",
                          active ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {category.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className={cn("w-full shrink-0", showCatalogChips ? "h-[152px] sm:h-[192px]" : "h-[112px] sm:h-[148px]")} aria-hidden="true" />

      <FloatingChat phoneDigits={contact.phoneDigits} />
    </>
  );
}
