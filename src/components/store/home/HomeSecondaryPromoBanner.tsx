import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { HomeBanner } from "@/hooks/useHomeContent";
import { publicImageUrl } from "@/utils/storage";

export function HomeSecondaryPromoBanner({ banner }: { banner: HomeBanner | null }) {
  if (!banner) return null;

  const img = publicImageUrl("banner-images", banner.image_desktop_path ?? banner.image_path ?? null);

  return (
    <Card className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="relative">
        {img ? (
          <img src={img} alt={banner.title} className="h-[220px] sm:h-[260px] w-full object-cover" loading="lazy" />
        ) : (
          <div className="h-[220px] sm:h-[260px] w-full fortlev-gradient opacity-80" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/55 to-transparent" />

        <div className="absolute inset-0 p-5 sm:p-8 flex items-end">
          <div className="max-w-xl">
            <div className="text-xs font-semibold text-muted-foreground">Promoção</div>
            <div className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight leading-[1.05]">{banner.title}</div>
            {banner.subtitle ? <div className="mt-2 text-sm text-muted-foreground">{banner.subtitle}</div> : null}
            <div className="mt-4 flex gap-3 flex-wrap">
              <Button asChild size="lg" className="h-12 rounded-xl">
                <Link to={banner.link_url || "/loja"}>{banner.button_label || "Ver oferta"}</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-xl">
                <Link to="/loja">Ver catálogo</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
