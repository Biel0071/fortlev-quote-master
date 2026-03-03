import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBannerImageUrls } from "@/utils/bannerStorage";

type BannerSliderItem = {
  image_desktop_path: string | null;
  image_mobile_path: string | null;
  link_url: string | null;
  position: number;
};

export function BannerSlider({ banners }: { banners: BannerSliderItem[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: banners.length > 1, align: "start" });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const hasMultiple = banners.length > 1;

  const updateControls = useCallback(() => {
    if (!emblaApi || !hasMultiple) {
      setCanPrev(false);
      setCanNext(false);
      return;
    }
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
  }, [emblaApi, hasMultiple]);

  useEffect(() => {
    if (!emblaApi) return;
    updateControls();
    emblaApi.on("select", updateControls);
    emblaApi.on("reInit", updateControls);
    return () => {
      emblaApi.off("select", updateControls);
      emblaApi.off("reInit", updateControls);
    };
  }, [emblaApi, updateControls]);

  const slides = useMemo(() => {
    return [...banners].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }, [banners]);

  if (slides.length === 0) {
    return (
      <div className="w-full overflow-hidden rounded-3xl border border-border bg-card">
        <div className="h-[220px] sm:h-[260px] lg:h-[400px] w-full bg-muted flex items-center justify-center text-sm text-muted-foreground">
          Nenhum banner disponível
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div ref={emblaRef} className="w-full overflow-hidden rounded-3xl border border-border bg-card">
        <div className="flex">
          {slides.map((banner, index) => {
            const desktopUrls = getBannerImageUrls(banner.image_desktop_path);
            const mobileUrls = getBannerImageUrls(banner.image_mobile_path);
            const desktopUrl = desktopUrls.primary || desktopUrls.legacy;
            const mobileUrl = mobileUrls.primary || mobileUrls.legacy;
            const destination = banner.link_url?.trim() || null;

            const imageContent = desktopUrl || mobileUrl ? (
              <picture>
                {mobileUrl ? <source media="(max-width: 640px)" srcSet={mobileUrl} /> : null}
                <img
                  src={desktopUrl || mobileUrl || "/placeholder.svg"}
                  alt={`Banner promocional ${banner.position || index + 1}`}
                  className="h-[220px] sm:h-[260px] lg:h-[400px] w-full object-cover object-center"
                  loading="lazy"
                  decoding="async"
                  data-fallback-src={desktopUrls.legacy || mobileUrls.legacy || ""}
                  onError={(event) => {
                    const fallback = event.currentTarget.dataset.fallbackSrc;
                    if (!fallback || event.currentTarget.src === fallback) return;
                    event.currentTarget.src = fallback;
                  }}
                />
              </picture>
            ) : (
              <div className="h-[220px] sm:h-[260px] lg:h-[400px] w-full bg-muted" />
            );

            return (
              <div key={`${banner.position}-${index}`} className="min-w-0 shrink-0 grow-0 basis-full">
                {destination ? (
                  <Link to={destination} className="block w-full cursor-pointer" aria-label={`Abrir banner ${banner.position || index + 1}`}>
                    {imageContent}
                  </Link>
                ) : (
                  <div className="w-full">{imageContent}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {hasMultiple ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute left-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-background/85"
            onClick={() => emblaApi?.scrollPrev()}
            disabled={!canPrev}
            aria-label="Banner anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-background/85"
            onClick={() => emblaApi?.scrollNext()}
            disabled={!canNext}
            aria-label="Próximo banner"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </>
      ) : null}
    </div>
  );
}
