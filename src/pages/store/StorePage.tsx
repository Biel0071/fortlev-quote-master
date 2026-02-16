import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StoreTopbar } from "@/components/store/StoreTopbar";
import { useCart } from "@/hooks/useCart";
import { useStorePages } from "@/hooks/useStorePages";
import { Button } from "@/components/ui/button";

function renderParagraphs(md: string) {
  // Minimal markdown-ish rendering (paragraphs + bullets). Avoid adding deps.
  const lines = md.split("\n");
  const blocks: Array<{ type: "p" | "li"; text: string }> = [];

  for (const raw of lines) {
    const t = raw.trim();
    if (!t) continue;
    if (t.startsWith("- ") || t.startsWith("• ")) {
      blocks.push({ type: "li", text: t.replace(/^(-|•)\s+/, "") });
    } else if (t.startsWith("# ")) {
      blocks.push({ type: "p", text: t.replace(/^#\s+/, "") });
    } else {
      blocks.push({ type: "p", text: t });
    }
  }

  const items = blocks.filter((b) => b.type === "li");
  const paras = blocks.filter((b) => b.type === "p");

  return { items, paras };
}

export default function StorePage() {
  const cart = useCart();
  const { slug = "" } = useParams();
  const { publishedPages, loading, error } = useStorePages();

  const page = useMemo(() => publishedPages.find((p) => p.slug === slug), [publishedPages, slug]);

  return (
    <div className="min-h-screen bg-background">
      <StoreTopbar cartCount={cart.totalItems} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Button asChild variant="ghost" className="w-fit">
          <Link to="/">← Voltar para a loja</Link>
        </Button>

        {loading ? (
          <div className="text-muted-foreground">Carregando...</div>
        ) : error ? (
          <div className="text-destructive">{error}</div>
        ) : !page ? (
          <Card>
            <CardHeader>
              <CardTitle>Página não encontrada</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Esta página institucional não existe ou não está publicada.
            </CardContent>
          </Card>
        ) : (
          <article className="space-y-4">
            <header className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{page.title}</h1>
              <p className="text-sm text-muted-foreground">Informações institucionais da loja.</p>
            </header>

            <Card>
              <CardContent className="py-6 space-y-4">
                {(() => {
                  const { items, paras } = renderParagraphs(page.content_md);
                  return (
                    <>
                      {paras.map((p, i) => (
                        <p key={i} className="text-sm sm:text-base leading-relaxed text-foreground/90">
                          {p.text}
                        </p>
                      ))}
                      {items.length > 0 && (
                        <ul className="list-disc pl-6 space-y-2 text-sm sm:text-base text-foreground/90">
                          {items.map((it, i) => (
                            <li key={i}>{it.text}</li>
                          ))}
                        </ul>
                      )}
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </article>
        )}
      </main>
    </div>
  );
}
