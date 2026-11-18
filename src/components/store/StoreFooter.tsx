import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Facebook, Instagram, MessageCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { publicImageUrl } from "@/utils/storage";
import { useHomeContent, type HomeFooter } from "@/hooks/useHomeContent";
import { useTenant } from "@/providers/TenantProvider";
import { useStoreContact } from "@/hooks/useStoreContact";
import { cloud } from "@/lib/cloud";
import { isDatabaseStoreId } from "@/utils/storeId";
import storeLogoPure from "@/assets/store-logo-pure.png";
import { PaymentLogosReal } from "@/components/store/pdp/PaymentLogosReal";
import { GooglePlayStoreBadge, GoogleRatingBadge } from "@/components/store/TrustAndAppBadges";
import seloSafeBrowsing from "@/assets/trust/selo-google-safe-browsing-vert.png";
import seloLojaProtegida from "@/assets/trust/selo-loja-protegida-upload.png";

type PageLinkItem = { title: string; slug: string };

const pageLinksCache = new Map<string, PageLinkItem[]>();

function formatWhatsappDisplay(digits: string): string {
  const local = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }
  return local;
}

export function StoreFooter({
  footer,
  pageLinks,
}: {
  footer?: HomeFooter | null;
  pageLinks?: PageLinkItem[];
}) {
  const { store } = useTenant();
  const homeContent = useHomeContent({ enabled: footer === undefined });
  const contact = useStoreContact();
  const [loadedPageLinks, setLoadedPageLinks] = useState<PageLinkItem[]>(() =>
    store?.id ? pageLinksCache.get(store.id) ?? [] : [],
  );

  useEffect(() => {
    if (pageLinks !== undefined || !isDatabaseStoreId(store?.id ?? null)) return;
    const storeId = store!.id;
    const cached = pageLinksCache.get(storeId);
    if (cached) {
      setLoadedPageLinks(cached);
      return;
    }

    let alive = true;
    cloud
      .from("store_pages")
      .select("title, slug, sort_order")
      .eq("store_id", storeId)
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (!alive) return;
        const rows = ((data ?? []) as Array<{ title: string; slug: string }>).map((x) => ({
          title: x.title,
          slug: x.slug,
        }));
        pageLinksCache.set(storeId, rows);
        setLoadedPageLinks(rows);
      });

    return () => {
      alive = false;
    };
  }, [pageLinks, store]);

  const resolvedFooter = footer !== undefined ? footer : homeContent.footer;
  const resolvedPageLinks = pageLinks !== undefined ? pageLinks : loadedPageLinks;

  const logoUrl = publicImageUrl("banner-images", resolvedFooter?.logo_path) || storeLogoPure;
  const storeName = resolvedFooter?.store_name || contact.storeName || store?.name || "Material Online";
  const rawWhatsapp = resolvedFooter?.whatsapp || contact.whatsappRaw || "31973484203";
  const waDigits = rawWhatsapp.replace(/\D/g, "");
  const waHref = waDigits
    ? `https://wa.me/${waDigits.startsWith("55") && waDigits.length >= 12 ? waDigits : `55${waDigits}`}`
    : "";

  const instagramUrl = resolvedFooter?.instagram_url ? String(resolvedFooter.instagram_url) : "";
  const facebookUrl = resolvedFooter?.facebook_url ? String(resolvedFooter.facebook_url) : "";
  const hasSocial = Boolean(instagramUrl || facebookUrl);

  const bySlug = new Map(resolvedPageLinks.map((p) => [p.slug, p] as const));
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
  ].filter(Boolean) as PageLinkItem[];

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
  ].filter(Boolean) as PageLinkItem[];

  const usedSlugs = new Set([...institutionalLinks, ...helpLinks].map((l) => l.slug));
  const extraPublishedLinks = resolvedPageLinks.filter((p) => !usedSlugs.has(p.slug));
  const gridSpanAll = hasSocial ? "md:col-span-12" : "md:col-span-10";

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <footer className="mt-auto border-t border-border bg-background w-full overflow-x-hidden">
        <div
          className={`max-w-6xl mx-auto px-3 sm:px-6 pt-8 sm:pt-10 pb-4 grid grid-cols-1 ${hasSocial ? "md:grid-cols-12" : "md:grid-cols-10"} gap-6 sm:gap-8 min-w-0`}
        >
          {/* Marca & Atendimento WhatsApp */}
          <div className="md:col-span-4 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <img src={logoUrl} alt={`Logo ${storeName}`} className="h-11 w-auto object-contain" loading="lazy" />

              {waHref ? (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100/90 transition-colors"
                >
                  <MessageCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Fale pelo WhatsApp</span>
                  <span className="text-xs font-medium text-emerald-700 tabular-nums">
                    {formatWhatsappDisplay(waDigits)}
                  </span>
                </a>
              ) : null}
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
                <>
                  <Link to="/loja" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
                    Catálogo Completo
                  </Link>
                  <Link to="/ofertas" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
                    Ofertas e Promoções
                  </Link>
                  <Link to="/orcamentos" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
                    Solicitar Orçamento
                  </Link>
                </>
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
                <>
                  <Link to="/rastreio" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
                    Rastrear Pedido
                  </Link>
                  <Link to="/pedidos" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
                    Meus Pedidos
                  </Link>
                  <Link to="/conta" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
                    Minha Conta
                  </Link>
                </>
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

          {/* Baixe nosso aplicativo (exclusivo Google Play) */}
          <div className={gridSpanAll} aria-label="Baixe nosso aplicativo">
            <div className="rounded-2xl bg-[#062a57] text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1">
                <div className="text-base sm:text-lg font-bold tracking-tight">Baixe nosso aplicativo</div>
                <p className="text-xs sm:text-sm text-white/80">
                  Compre com rapidez, acompanhe entregas ao vivo e acesse o app oficial Material Online.
                </p>
              </div>
              <div className="shrink-0">
                <GooglePlayStoreBadge to="/google-play" />
              </div>
            </div>
          </div>

          {/* Formas de pagamento (global) */}
          <div className={`${gridSpanAll} space-y-3`} aria-label="Formas de pagamento">
            <div className="font-semibold">Formas de pagamento</div>
            <div className="-mt-1">
              <PaymentLogosReal />
            </div>
          </div>

          {/* Selos de Segurança (clicáveis -> rolam suavemente para o topo da página) */}
          <div className={`${gridSpanAll} space-y-3`} aria-label="Selos de Segurança">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <div className="font-semibold">Selos de Segurança</div>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4 sm:p-5 flex items-center justify-center">
              <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-8">
                <GoogleRatingBadge rating="4,8" onClick={scrollToTop} />

                <button
                  type="button"
                  onClick={scrollToTop}
                  title="Google Safe Browsing — Voltar ao topo"
                  aria-label="Selo de Segurança: Google Safe Browsing — Voltar ao topo da página"
                  className="cursor-pointer rounded-xl p-1 transition-transform hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <img
                    src={seloSafeBrowsing}
                    alt="Selo de Segurança: Google Safe Browsing"
                    className="max-h-[4.375rem] w-auto max-w-full object-contain"
                    loading="lazy"
                  />
                </button>

                <button
                  type="button"
                  onClick={scrollToTop}
                  title="Compra 100% Segura e Loja Protegida — Voltar ao topo"
                  aria-label="Selo de Segurança: Compra 100% Segura e Loja Protegida — Voltar ao topo da página"
                  className="cursor-pointer rounded-xl p-1 transition-transform hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <img
                    src={seloLojaProtegida}
                    alt="Selo de Segurança: Compra 100% Segura e Loja Protegida"
                    className="max-h-[4.375rem] w-auto max-w-full object-contain"
                    loading="lazy"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border py-4 md:py-6 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-6">
          <div className="max-w-6xl mx-auto px-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <div>
              {storeName} • {new Date().getFullYear()}
            </div>
            <div className="flex items-center gap-2">
              <span>Ambiente seguro</span>
            </div>
          </div>
        </div>
      </footer>
      {/* Spacer for fixed mobile bottom nav */}
      <div className="h-16 md:h-0 w-full shrink-0" aria-hidden="true" />
    </>
  );
}
