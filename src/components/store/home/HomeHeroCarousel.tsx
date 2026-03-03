import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getBannerImageUrls } from "@/utils/bannerStorage";
import type { HomeBanner } from "@/hooks/useHomeContent";

function pickBannerImage(b: HomeBanner) {
  // Prefer explicit desktop/mobile images, fallback to legacy image_path
  return {
    desktop: b.image_desktop_path ?? b.image_path,
    mobile: b.image_mobile_path ?? b.image_path,
  };
}

export function HomeHeroCarousel({
  banners,
  loading,
}: {
  banners: HomeBanner[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 opacity-25 fortlev-gradient" />
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-muted/40 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-muted/30 blur-3xl" />
        </div>
        <div className="relative p-6 sm:p-10">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7 space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-12 w-full max-w-xl" />
              <Skeleton className="h-5 w-full max-w-2xl" />
              <div className="flex gap-3">
                <Skeleton className="h-11 w-36" />
                <Skeleton className="h-11 w-36" />
              </div>
            </div>
            <div className="lg:col-span-5">
              <Skeleton className="h-56 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  const fallback = {
    title: "Materiais de construção, organizados por categoria",
    subtitle: "Navegue por categorias, adicione ao carrinho e finalize seu pedido.",
  };

  if (!banners || banners.length === 0) {
    return (
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 opacity-25 fortlev-gradient" />
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-muted/40 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-muted/30 blur-3xl" />
        </div>

        <div className="relative p-6 sm:p-10">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7 space-y-4">
              <Badge variant="secondary" className="w-fit">
                Frete rápido • Retire ou receba
              </Badge>

              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-[1.05]">{fallback.title}</h1>

              <p className="text-muted-foreground max-w-2xl">{fallback.subtitle}</p>

              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/loja">Ver catálogo</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/carrinho">Ver carrinho</Link>
                </Button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <Card className="rounded-2xl bg-muted/20 backdrop-blur supports-[backdrop-filter]:bg-muted/10 overflow-hidden">
                <img
                  src="/placeholder.svg"
                  alt="Placeholder de banner"
                  className="h-56 w-full object-cover"
                  loading="lazy"
                />
                <CardContent className="p-5">
                  <div className="text-sm text-muted-foreground">Banner em configuração</div>
                  <div className="mt-1 font-semibold">Cadastre banners no admin para exibir aqui</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Simple, dependency-free carousel (radio-like). Keeps the industrial/glass look.
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-25 fortlev-gradient" />
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-muted/40 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-muted/30 blur-3xl" />
      </div>

      <div className="relative">
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 sm:px-6 py-4 sm:py-6">
          {banners.map((b) => {
            const img = pickBannerImage(b);
            const desktopUrls = getBannerImageUrls(img.desktop);
            const mobileUrls = getBannerImageUrls(img.mobile);
            const desktopUrl = desktopUrls.primary;
            const mobileUrl = mobileUrls.primary;
            const fallbackDesktopUrl = desktopUrls.legacy;
            const fallbackMobileUrl = mobileUrls.legacy;

            return (
              <article
                key={b.id}
                className="snap-start shrink-0 w-[88%] sm:w-[70%] lg:w-[60%] rounded-3xl border border-border bg-card/60 backdrop-blur overflow-hidden"
              >
                <div className="relative">
                  {desktopUrl || mobileUrl ? (
                    <picture>
                      {/* mobile first */}
                      {mobileUrl ? <source media="(max-width: 640px)" srcSet={mobileUrl} /> : null}
                      <img
                        src={desktopUrl || mobileUrl}
                        alt={b.title}
                        className="h-56 sm:h-72 w-full object-cover"
                        loading="lazy"
                        data-fallback-src={fallbackDesktopUrl || fallbackMobileUrl}
                        onError={(event) => {
                          const fallback = event.currentTarget.dataset.fallbackSrc;
                          if (!fallback) return;
                          if (event.currentTarget.src === fallback) return;
                          event.currentTarget.src = fallback;
                        }}
                      />
                    </picture>
                  ) : (
                    <div className="h-56 sm:h-72 w-full fortlev-gradient opacity-80" />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/10 to-transparent" />

                  <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                    <Badge variant="secondary" className="w-fit">
                      Vitrine de ofertas
                    </Badge>
                    <h1 className="mt-3 text-2xl sm:text-4xl font-bold tracking-tight leading-[1.05]">{b.title}</h1>
                    {b.subtitle ? <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl">{b.subtitle}</p> : null}

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button asChild size="lg">
                        <Link to={b.link_url || b.link || "/loja"}>{b.button_label || "Ver ofertas"}</Link>
                      </Button>
                      <Button asChild size="lg" variant="outline">
                        <Link to="/carrinho">Ver carrinho</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="px-6 pb-5">
          <div className="text-xs text-muted-foreground">Arraste para ver mais banners</div>
        </div>
      </div>
    </section>
  );
}
