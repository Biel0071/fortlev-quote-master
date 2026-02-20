import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Flame,
  LayoutGrid,
  MoreVertical,
  PackageSearch,
  Search,
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
import { useHomeContent } from "@/hooks/useHomeContent";
import { useStoreCategories } from "@/hooks/useStoreCategories";
import { useStoreContact } from "@/hooks/useStoreContact";
import { FloatingChat } from "@/components/store/mobile/FloatingChat";
import storeLogo from "@/assets/store-logo-materiais-cropped.png";

export function StoreTopbar({
  cartCount,
  onCartClick,
}: {
  cartCount: number;
  onCartClick?: () => void;
}) {
  const nav = useNavigate();
  const { footer } = useHomeContent();
  const { activeCategories } = useStoreCategories();
  const contact = useStoreContact();

  const [q, setQ] = useState("");

  const submitSearch = () => {
    const term = q.trim();
    nav(term ? `/loja?q=${encodeURIComponent(term)}` : "/loja");
  };

  const brandLabel = footer?.store_name || "Materiais de Construção";
  const menuCategories = useMemo(() => (activeCategories ?? []).slice(0, 12), [activeCategories]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        {/* Top info bar */}
        <div className="border-b border-border bg-secondary/40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2">
            <div className="text-xs sm:text-sm text-muted-foreground text-center font-medium">
              Frete rápido • Retire na loja • Parcelamos em até 10x
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-4">
          <div className="flex flex-col gap-4">
            {/* Logo centralizada */}
            <div className="flex items-center justify-center">
              <Link to="/materiais" className="flex items-center justify-center" aria-label={brandLabel}>
                <img
                  src={storeLogo}
                  alt={`${brandLabel} - logo`}
                  className="h-[84px] w-[84px] sm:h-[92px] sm:w-[92px] rounded-2xl shadow-md"
                  loading="eager"
                />
              </Link>
            </div>

            {/* Busca + Ações */}
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar produtos..."
                    className="pl-11 h-12 w-full rounded-2xl"
                    aria-label="Buscar produtos"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitSearch();
                    }}
                  />
                </div>
              </div>

              <nav className="flex items-center gap-1 shrink-0">
                <Button asChild variant="ghost" size="icon" className="h-11 w-11 rounded-2xl" aria-label="Perfil">
                  <Link to="/conta">
                    <User className="h-5 w-5" />
                  </Link>
                </Button>

                <Button asChild variant="ghost" size="icon" className="h-11 w-11 rounded-2xl" aria-label="Rastreio">
                  <Link to="/pedidos">
                    <PackageSearch className="h-5 w-5" />
                  </Link>
                </Button>

                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-11 w-11 rounded-2xl" aria-label="Mais opções">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>

                  <SheetContent side="right" className="w-[22rem] sm:w-[24rem] bg-background">
                    <SheetHeader>
                      <SheetTitle className="tracking-tight">Acesso rápido</SheetTitle>
                      <SheetDescription>Navegue pelas seções da loja e sua conta.</SheetDescription>
                    </SheetHeader>

                    <div className="mt-5 space-y-5">
                      <section className="space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground">Loja</div>
                        <div className="grid gap-2">
                          <Button asChild variant="outline" className="justify-start rounded-2xl h-12">
                            <Link to="/materiais#ofertas" className="flex items-center gap-2">
                              <Tag className="h-5 w-5" />
                              Ofertas
                            </Link>
                          </Button>
                          <Button asChild variant="outline" className="justify-start rounded-2xl h-12">
                            <Link to="/materiais#mais-vendidos" className="flex items-center gap-2">
                              <Flame className="h-5 w-5" />
                              Mais vendidos
                            </Link>
                          </Button>
                        </div>
                      </section>

                      <Separator />

                      <section className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-semibold text-muted-foreground">Categorias</div>
                          <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                        </div>

                        {menuCategories.length > 0 ? (
                          <div className="max-h-72 overflow-auto pr-1 grid gap-1">
                            {menuCategories.map((c) => (
                              <Button key={c.id} asChild variant="ghost" className="justify-start rounded-xl h-10">
                                <Link to={`/loja?categoria=${encodeURIComponent(c.slug)}`}>{c.name}</Link>
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">Carregando categorias...</div>
                        )}
                      </section>

                      <Separator />

                      <section className="space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground">Conta</div>
                        <div className="grid gap-2">
                          <Button asChild variant="secondary" className="justify-start rounded-2xl h-12">
                            <Link to="/conta">Minha conta</Link>
                          </Button>
                          <Button asChild variant="secondary" className="justify-start rounded-2xl h-12">
                            <Link to="/pedidos">Meus pedidos / Rastreio</Link>
                          </Button>
                          <Button
                            asChild
                            variant="secondary"
                            className="justify-start rounded-2xl h-12"
                            onClick={() => onCartClick?.()}
                          >
                            <Link to="/carrinho">Carrinho{cartCount > 0 ? ` (${cartCount})` : ""}</Link>
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

      {/* Botão flutuante único (IA + WhatsApp) */}
      <FloatingChat phoneDigits={contact.phoneDigits} />
    </>
  );
}
