import { Link } from "react-router-dom";
import { Facebook, Instagram, MessageCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { publicImageUrl } from "@/utils/storage";
import type { HomeFooter } from "@/hooks/useHomeContent";

import { PaymentLogosReal } from "@/components/store/pdp/PaymentLogosReal";
import seloSafeBrowsing from "@/assets/trust/selo-google-safe-browsing-vert.png";
import seloLojaProtegida from "@/assets/trust/selo-loja-protegida-upload.png";

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
  const instagramUrl = (footer as any)?.instagram_url ? String((footer as any).instagram_url) : "";
  const facebookUrl = (footer as any)?.facebook_url ? String((footer as any).facebook_url) : "";
  const hasSocial = Boolean(instagramUrl || facebookUrl);

  const bySlug = new Map(pageLinks.map((p) => [p.slug, p] as const));
  const institutionalLinks = [
    bySlug.get("politica-de-privacidade")
      ? { title: "Política de Privacidade", slug: bySlug.get("politica-de-privacidade")!.slug }
      : null,
    bySlug.get("politica-de-trocas-e-devolucoes")
      ? { title: "Trocas e Devoluções", slug: bySlug.get("politica-de-trocas-e-devolucoes")!.slug }
      : null,
    bySlug.get("termos-de-uso")
      ? { title: "Termos de Uso", slug: bySlug.get("termos-de-uso")!.slug }
      : bySlug.get("politica-de-vendas")
        ? { title: "Termos de Uso", slug: bySlug.get("politica-de-vendas")!.slug }
        : null,
  ].filter(Boolean) as Array<{ title: string; slug: string }>;

  const helpLinks = [
    bySlug.get("entrega-e-retirada")
      ? { title: "Entrega e retirada", slug: bySlug.get("entrega-e-retirada")!.slug }
      : bySlug.get("entrega")
        ? { title: "Entrega e retirada", slug: bySlug.get("entrega")!.slug }
        : null,
    bySlug.get("formas-de-pagamento")
      ? { title: "Formas de pagamento", slug: bySlug.get("formas-de-pagamento")!.slug }
      : bySlug.get("pagamento")
        ? { title: "Formas de pagamento", slug: bySlug.get("pagamento")!.slug }
        : null,
    bySlug.get("garantia")
      ? { title: "Garantia", slug: bySlug.get("garantia")!.slug }
      : bySlug.get("politica-de-vendas")
        ? { title: "Garantia", slug: bySlug.get("politica-de-vendas")!.slug }
        : null,
    bySlug.get("fale-conosco")
      ? { title: "Fale conosco", slug: bySlug.get("fale-conosco")!.slug }
      : bySlug.get("contato")
        ? { title: "Fale conosco", slug: bySlug.get("contato")!.slug }
        : null,
  ].filter(Boolean) as Array<{ title: string; slug: string }>;

  const usedSlugs = new Set([...institutionalLinks, ...helpLinks].map((l) => l.slug));
  const extraPublishedLinks = pageLinks.filter((p) => !usedSlugs.has(p.slug));

  const gridSpanAll = hasSocial ? "md:col-span-12" : "md:col-span-10";

  return (
    <footer className="border-t border-border bg-background">
      <div
        className={`max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-4 grid grid-cols-1 ${hasSocial ? "md:grid-cols-12" : "md:grid-cols-10"} gap-8`}
      >
        {/* Marca */}
        <div className="md:col-span-4 space-y-4">
          <div className="flex items-center gap-3">
            {logoUrl ? <img src={logoUrl} alt="Logo da loja" className="h-12 w-auto" loading="lazy" /> : null}

            {whatsapp ? (
              <div className="flex items-center gap-2 text-sm">
                <MessageCircle className="h-4 w-4" />
                <a
                  className="font-medium hover:underline"
                  href={`https://wa.me/55${whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {whatsapp}
                </a>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">WhatsApp indisponível</div>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button asChild className="h-11 rounded-2xl">
              <Link to="/loja">Ver catálogo</Link>
            </Button>
          </div>
        </div>

        {/* Institucional */}
        <div className="md:col-span-3 space-y-3">
          <div className="font-semibold">Institucional</div>
          <div className="grid gap-2">
            {institutionalLinks.length > 0 ? (
              institutionalLinks.map((p) => (
                <Link
                  key={p.slug}
                  to={`/p/${p.slug}`}
                  className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                >
                  {p.title}
                </Link>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">Em breve</div>
            )}

            {extraPublishedLinks.map((p) => (
              <Link
                key={p.slug}
                to={`/p/${p.slug}`}
                className="text-sm text-muted-foreground hover:text-foreground hover:underline"
              >
                {p.title}
              </Link>
            ))}
          </div>
        </div>

        {/* Ajuda */}
        <div className="md:col-span-3 space-y-3">
          <div className="font-semibold">Ajuda</div>
          <div className="grid gap-2">
            {helpLinks.length > 0 ? (
              helpLinks.map((p) => (
                <Link
                  key={p.slug}
                  to={`/p/${p.slug}`}
                  className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                >
                  {p.title}
                </Link>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">Em breve</div>
            )}
          </div>
        </div>

        {/* Social (dinâmico) */}
        {hasSocial ? (
          <div className="md:col-span-2 space-y-3">
            <div className="font-semibold">Redes</div>
            <div className="flex gap-2">
              {instagramUrl ? (
                <a
                  className="h-11 w-11 rounded-2xl border border-border bg-card shadow-sm flex items-center justify-center hover:shadow-md transition-shadow"
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              ) : null}
              {facebookUrl ? (
                <a
                  className="h-11 w-11 rounded-2xl border border-border bg-card shadow-sm flex items-center justify-center hover:shadow-md transition-shadow"
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                >
                  <Facebook className="h-5 w-5" />
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Formas de pagamento (global) */}
        <div className={`${gridSpanAll} space-y-3`} aria-label="Formas de pagamento">
          <div className="font-semibold">Formas de pagamento</div>
          <div className="-mt-1">
            <PaymentLogosReal />
          </div>
        </div>

        {/* Selos de Segurança (somente no rodapé) */}
        <div className={`${gridSpanAll} space-y-3`} aria-label="Selos de Segurança">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <div className="font-semibold">Selos de Segurança</div>
          </div>
          <div className="rounded-2xl border border-border bg-background p-5 flex items-center justify-center">
            <div className="flex flex-wrap items-center justify-center gap-6">
              <img
                src={seloSafeBrowsing}
                alt="Selo de Segurança: Google Safe Browsing"
                className="max-h-[4.375rem] w-auto max-w-full object-contain"
                loading="lazy"
              />
              <img
                src={seloLojaProtegida}
                alt="Selo de Segurança: Loja Protegida"
                className="max-h-[4.375rem] w-auto max-w-full object-contain"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border py-4 md:py-6 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-6">
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
