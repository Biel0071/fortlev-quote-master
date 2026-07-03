import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AppHeader } from "@/components/store/AppHeader";
import { StoreMobileChrome } from "@/components/store/mobile/StoreMobileChrome";
import { useCart } from "@/hooks/useCart";
import { useStorePages } from "@/hooks/useStorePages";
import { Button } from "@/components/ui/button";
import { useStoreContact } from "@/hooks/useStoreContact";
import { useHomeContent } from "@/hooks/useHomeContent";
import { useTenant } from "@/providers/TenantProvider";
import { cloud } from "@/lib/cloud";
import { useDynamicSeo } from "@/hooks/useDynamicSeo";
import { getInstitutionalModel } from "@/content/institutionalCopy";
import { InstitutionalPremiumContent } from "@/components/institutional/InstitutionalPremiumContent";
import { StoreFooter } from "@/components/store/StoreFooter";
import { JobApplicationForm } from "@/components/institutional/JobApplicationForm";

type MdBlock =
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "li"; text: string };

function parseMd(md: string): MdBlock[] {
  const lines = (md ?? "").split("\n");
  const out: MdBlock[] = [];

  for (const raw of lines) {
    const t = raw.trim();
    if (!t) continue;

    if (t.startsWith("## ")) {
      out.push({ type: "h2", text: t.replace(/^##\s+/, "") });
      continue;
    }

    if (t.startsWith("- ") || t.startsWith("• ")) {
      out.push({ type: "li", text: t.replace(/^(-|•)\s+/, "") });
      continue;
    }

    // Ignore H1 in markdown (page.title is the H1)
    if (t.startsWith("# ")) continue;

    out.push({ type: "p", text: t });
  }

  return out;
}

function splitIntoSections(blocks: MdBlock[]) {
  const sections: Array<{ title: string | null; paragraphs: string[]; items: string[] }> = [];
  let current = { title: null as string | null, paragraphs: [] as string[], items: [] as string[] };

  const push = () => {
    if (current.title || current.paragraphs.length > 0 || current.items.length > 0) sections.push(current);
    current = { title: null, paragraphs: [], items: [] };
  };

  for (const b of blocks) {
    if (b.type === "h2") {
      push();
      current.title = b.text;
      continue;
    }
    if (b.type === "p") current.paragraphs.push(b.text);
    if (b.type === "li") current.items.push(b.text);
  }

  push();
  return sections;
}

function copyForSlug(slug: string) {
  switch ((slug ?? "").toLowerCase()) {
    case "entrega-e-retirada":
    case "entrega":
      return {
        subtitle: "Prazos, regras de retirada e como funciona a entrega no seu endereço.",
        metaDescription: "Veja prazos de entrega, opções de retirada e regras importantes para receber seus materiais com segurança.",
      };
    case "formas-de-pagamento":
    case "pagamento":
      return {
        subtitle: "Cartão, PIX, parcelamento e detalhes de confirmação do pedido.",
        metaDescription: "Entenda as formas de pagamento disponíveis, parcelamento e como confirmamos seu pedido.",
      };
    case "garantia":
      return {
        subtitle: "Cobertura, prazos e como solicitar suporte quando necessário.",
        metaDescription: "Saiba como funciona a garantia, prazos de cobertura e como acionar suporte de forma rápida.",
      };
    case "politica-de-privacidade":
      return {
        subtitle: "Como coletamos, usamos e protegemos seus dados durante a compra.",
        metaDescription: "Confira nossa política de privacidade e como protegemos seus dados ao navegar e comprar na loja.",
      };
    case "politica-de-trocas-e-devolucoes":
      return {
        subtitle: "Condições, prazos e passos para troca ou devolução de produtos.",
        metaDescription: "Veja as regras de trocas e devoluções, prazos e orientações para solicitar sua troca.",
      };
    case "termos-de-uso":
    case "politica-de-vendas":
      return {
        subtitle: "Regras de uso do site, condições de compra e responsabilidades.",
        metaDescription: "Leia os termos de uso e as condições de compra para navegar e comprar com clareza.",
      };
    case "fale-conosco":
    case "contato":
      return {
        subtitle: "Canais de atendimento para tirar dúvidas e pedir orientação na sua compra.",
        metaDescription: "Fale com a loja para tirar dúvidas, pedir orientação e garantir o material certo para sua obra.",
      };
    default:
      return {
        subtitle: "Informações objetivas para você comprar com clareza e segurança.",
        metaDescription: "Informações institucionais da loja: regras, prazos e orientações para uma compra segura.",
      };
  }
}

export default function StorePage() {
  const cart = useCart();
  const { slug = "" } = useParams();
  const { store } = useTenant();
  const { publishedPages, loading, error } = useStorePages();
  const contact = useStoreContact();
  const home = useHomeContent();
  const [pageLinks, setPageLinks] = useState<Array<{ title: string; slug: string }>>([]);

  const page = useMemo(() => publishedPages.find((p) => p.slug === slug), [publishedPages, slug]);
  const copy = useMemo(() => copyForSlug(slug), [slug]);

  const storeName = (contact.storeName || "Materiais de Construção").trim();
  const model = useMemo(() => getInstitutionalModel(slug, storeName), [slug, storeName]);
  const isJob = (slug ?? "").toLowerCase() === "trabalhe-conosco";

  const pageTitle = (model?.title || (isJob ? "Trabalhe conosco" : null) || page?.title || "Página").trim();
  const metaTitle = `${pageTitle} | ${storeName}`;

  useDynamicSeo({
    title: metaTitle,
    description: copy.metaDescription,
    canonicalPath: `/p/${encodeURIComponent(slug)}`,
  });

  const sections = useMemo(() => (page ? splitIntoSections(parseMd(page.content_md)) : []), [page]);

  useEffect(() => {
    if (!store?.id) return;
    
    let alive = true;
    cloud
      .from("store_pages")
      .select("title, slug, sort_order")
      .eq("store_id", store.id)
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (!alive) return;
        setPageLinks(((data ?? []) as any[]).map((x: any) => ({ title: x.title, slug: x.slug })));
      });

    return () => {
      alive = false;
    };
  }, [store?.id]);

  const headerSubtitle =
    model?.subtitle ??
    (isJob ? "Envie sua candidatura para nosso banco de talentos interno." : null) ??
    copy.subtitle;

  return (
    <div className="flex flex-col bg-background">
      <AppHeader cartCount={cart.totalItems} />
      <StoreMobileChrome cartCount={cart.totalItems} />

      <main className="main-content mx-auto w-full max-w-[880px] px-4 sm:px-6 py-12 pb-24 md:pb-14 space-y-10">
        <Button asChild variant="ghost" className="w-fit">
          <Link to="/">← Voltar para a loja</Link>
        </Button>

        {loading ? (
          <div className="text-muted-foreground">Carregando...</div>
        ) : error ? (
          <div className="text-destructive">{error}</div>
        ) : !page && !model && !isJob ? (
          <Card>
            <CardHeader>
              <CardTitle>Página não encontrada</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">Esta página institucional não existe ou não está publicada.</CardContent>
          </Card>
        ) : (
          <article className="space-y-10">
            <header className="relative overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/10 via-background to-accent/10 px-6 sm:px-10 py-10 sm:py-14 shadow-sm">
              <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
              <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
              <div className="relative space-y-3 max-w-2xl">
                <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-[1.05]">{pageTitle}</h1>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{headerSubtitle}</p>
              </div>
            </header>

            {slug.toLowerCase() === "trabalhe-conosco" ? (
              <JobApplicationForm />
            ) : model ? (
              <InstitutionalPremiumContent model={model} />
            ) : (
              <Accordion
                type="multiple"
                defaultValue={sections.map((_, i) => `item-${i}`)}
                className="space-y-3"
              >
                {sections.map((s, idx) => (
                  <AccordionItem
                    key={idx}
                    value={`item-${idx}`}
                    className="group rounded-2xl border border-border/60 bg-card shadow-sm transition-all data-[state=open]:border-primary/30 data-[state=open]:shadow-md overflow-hidden"
                  >
                    <AccordionTrigger className="px-5 sm:px-7 py-4 sm:py-5 hover:no-underline">
                      <div className="flex items-center gap-3 text-left">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                          {String(idx + 1).padStart(2, "0")}
                        </div>
                        <span className="text-base sm:text-lg font-bold tracking-tight leading-tight">
                          {s.title ?? "Detalhes"}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-5 sm:px-7 pb-6">
                      <div className="pl-11 space-y-4">
                        {s.paragraphs.length > 0 ? (
                          <div className="space-y-3">
                            {s.paragraphs.map((p, i) => (
                              <p key={i} className="text-sm sm:text-base leading-relaxed text-foreground/85">
                                {p}
                              </p>
                            ))}
                          </div>
                        ) : null}

                        {s.items.length > 0 ? (
                          <ul className="space-y-2.5">
                            {s.items.map((it, i) => (
                              <li key={i} className="flex items-start gap-3 text-sm sm:text-base text-foreground/85">
                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                                <span className="leading-relaxed">{it}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}

            <Card className="rounded-2xl">
              <CardContent className="py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-semibold">Precisa de ajuda?</div>
                  <div className="text-sm text-muted-foreground">
                    Fale com nossa consultora pelo WhatsApp e te ajudamos a escolher o material certo.
                  </div>
                </div>

                {contact.waLink ? (
                  <Button asChild className="h-11 rounded-2xl">
                    <a href={contact.waLink} target="_blank" rel="noreferrer">
                      Chamar no WhatsApp
                    </a>
                  </Button>
                ) : (
                  <div className="text-sm text-muted-foreground">WhatsApp indisponível no momento.</div>
                )}
              </CardContent>
            </Card>
          </article>
        )}
      </main>

      <StoreFooter footer={home.footer} pageLinks={pageLinks} />
    </div>
  );
}

