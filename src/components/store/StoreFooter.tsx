import { Link } from "react-router-dom";
import { Facebook, Instagram, MapPin, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { publicImageUrl } from "@/utils/storage";
import type { HomeFooter } from "@/hooks/useHomeContent";

export function StoreFooter({
  footer,
  pageLinks,
}: {
  footer: HomeFooter | null;
  pageLinks: Array<{ title: string; slug: string }>;
}) {
  const logoUrl = publicImageUrl("banner-images", footer?.logo_path);
  const storeName = footer?.store_name || "Materiais de Construção";
  const whatsapp = footer?.whatsapp || "";

  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-12 gap-10">
        {/* Marca */}
        <div className="md:col-span-4 space-y-4">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={`Logo ${storeName}`} className="h-10 w-auto" loading="lazy" />
            ) : (
              <div className="h-10 w-10 rounded-2xl fortlev-gradient" aria-hidden="true" />
            )}
            <div>
              <div className="font-semibold">{storeName}</div>
              {footer?.extra_note ? <div className="text-xs text-muted-foreground">{footer.extra_note}</div> : null}
            </div>
          </div>

          {footer?.address ? (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mt-0.5" />
              <span>{footer.address}</span>
            </div>
          ) : null}

          {whatsapp ? (
            <div className="flex items-center gap-2 text-sm">
              <MessageCircle className="h-4 w-4" />
              <span className="text-muted-foreground">WhatsApp:</span>
              <a
                className="font-medium hover:underline"
                href={`https://wa.me/55${whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
              >
                {whatsapp}
              </a>
            </div>
          ) : null}

          <div className="flex gap-2 flex-wrap">
            <Button asChild className="h-11 rounded-2xl">
              <Link to="/loja">Ver catálogo</Link>
            </Button>
            <Button asChild className="h-11 rounded-2xl" variant="outline">
              <Link to="/carrinho">Carrinho</Link>
            </Button>
          </div>
        </div>

        {/* Institucional */}
        <div className="md:col-span-3 space-y-3">
          <div className="font-semibold">Institucional</div>
          <div className="grid gap-2">
            {(() => {
              const bySlug = new Map(pageLinks.map((p) => [p.slug, p] as const));
              const privacy = bySlug.get("politica-de-privacidade");
              const returns = bySlug.get("politica-de-trocas-e-devolucoes");
              const terms = bySlug.get("termos-de-uso") ?? bySlug.get("politica-de-vendas");

              const links = [
                privacy ? { title: "Política de Privacidade", slug: privacy.slug } : null,
                returns ? { title: "Trocas e Devoluções", slug: returns.slug } : null,
                terms ? { title: "Termos de Uso", slug: terms.slug } : null,
              ].filter(Boolean) as Array<{ title: string; slug: string }>;

              return links.length > 0 ? (
                links.map((p) => (
                  <Link key={p.slug} to={`/p/${p.slug}`} className="text-sm text-muted-foreground hover:text-foreground hover:underline">
                    {p.title}
                  </Link>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">Em breve</div>
              );
            })()}
          </div>
        </div>

        {/* Ajuda */}
        <div className="md:col-span-3 space-y-3">
          <div className="font-semibold">Ajuda</div>
          <div className="grid gap-2">
            <Link to="/checkout" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
              Entrega e retirada
            </Link>
            <Link to="/checkout" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
              Formas de pagamento
            </Link>
            <Link to="/p/politica-de-vendas" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
              Garantia
            </Link>
            <Link to="/p/contato" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
              Fale conosco
            </Link>
          </div>
        </div>

        {/* Social */}
        <div className="md:col-span-2 space-y-3">
          <div className="font-semibold">Redes</div>
          <div className="flex gap-2">
            <a
              className="h-11 w-11 rounded-2xl border border-border bg-card shadow-sm flex items-center justify-center hover:shadow-md transition-shadow"
              href="#"
              aria-label="Instagram"
            >
              <Instagram className="h-5 w-5" />
            </a>
            <a
              className="h-11 w-11 rounded-2xl border border-border bg-card shadow-sm flex items-center justify-center hover:shadow-md transition-shadow"
              href="#"
              aria-label="Facebook"
            >
              <Facebook className="h-5 w-5" />
            </a>
          </div>
          <div className="text-xs text-muted-foreground">Atualize os links das redes quando desejar.</div>
        </div>
      </div>

      <div className="border-t border-border py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <div>
            {storeName} • {new Date().getFullYear()}
          </div>
          <div className="flex items-center gap-2">
            <span>Ambiente seguro</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

