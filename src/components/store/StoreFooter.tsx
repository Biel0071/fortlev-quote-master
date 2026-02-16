import { Link } from "react-router-dom";
import { Building2, Clock, MapPin, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { publicImageUrl } from "@/utils/storage";
import type { HomeFooter } from "@/hooks/useHomeContent";

export function StoreFooter({ footer, pageLinks }: { footer: HomeFooter | null; pageLinks: Array<{ title: string; slug: string }> }) {
  const logoUrl = publicImageUrl("banner-images", footer?.logo_path);
  const storeName = footer?.store_name || "Materiais de Construção";
  const whatsapp = footer?.whatsapp || "";

  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-5 space-y-4">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={`Logo ${storeName}`} className="h-10 w-auto" loading="lazy" />
            ) : (
              <div className="h-10 w-10 rounded-xl fortlev-gradient" aria-hidden="true" />
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

          {footer?.hours ? (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 mt-0.5" />
              <span>{footer.hours}</span>
            </div>
          ) : null}

          {whatsapp ? (
            <div className="flex items-center gap-2 text-sm">
              <MessageCircle className="h-4 w-4" />
              <span className="text-muted-foreground">WhatsApp:</span>
              <a className="font-medium hover:underline" href={`https://wa.me/55${whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                {whatsapp}
              </a>
            </div>
          ) : null}

          <div className="flex gap-2 flex-wrap">
            <Button asChild size="sm" variant="outline">
              <Link to="/loja">Ver catálogo</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/checkout">Finalizar</Link>
            </Button>
          </div>
        </div>

        <div className="md:col-span-4 space-y-3">
          <div className="font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Institucional
          </div>
          <div className="grid grid-cols-1 gap-2">
            {pageLinks.slice(0, 6).map((p) => (
              <Link key={p.slug} to={`/p/${p.slug}`} className="text-sm text-muted-foreground hover:text-foreground hover:underline">
                {p.title}
              </Link>
            ))}
          </div>
        </div>

        <div className="md:col-span-3 space-y-3">
          <div className="font-medium">Atalhos</div>
          <div className="grid grid-cols-1 gap-2">
            <Link to="/carrinho" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
              Carrinho
            </Link>
            <Link to="/checkout" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
              Checkout
            </Link>
            <Link to="/loja" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
              Catálogo
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-border py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center text-xs text-muted-foreground">
          {storeName} • {new Date().getFullYear()}
        </div>
      </div>
    </footer>
  );
}
