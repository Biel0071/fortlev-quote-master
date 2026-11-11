import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBannerImageUrls } from "@/utils/bannerStorage";
import { cn } from "@/lib/utils";

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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const hasMultiple = banners.length > 1;

  const updateControls = useCallback(() => {
    if (!emblaApi || !hasMultiple) {
      setCanPrev(false);
      setCanNext(false);
      return;
    }
    setSelectedIndex(emblaApi.selectedScrollSnap());
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
    return null;
  }

  return (
    <div className="relative w-full group/slider">
      <div ref={emblaRef} className="w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-border/80 bg-muted/30 shadow-xs">
        <div className="flex">
          {slides.map((banner, index) => {
            const rawDesktop = banner.image_desktop_path;
            const rawMobile = banner.image_mobile_path;
            const isLocalDesktop = rawDesktop?.startsWith("/") || rawDesktop?.startsWith("data:") || rawDesktop?.startsWith("blob:");
            const isLocalMobile = rawMobile?.startsWith("/") || rawMobile?.startsWith("data:") || rawMobile?.startsWith("blob:");

            const desktopUrls = isLocalDesktop ? { primary: rawDesktop!, legacy: rawDesktop! } : getBannerImageUrls(rawDesktop);
            const mobileUrls = isLocalMobile ? { primary: rawMobile!, legacy: rawMobile! } : getBannerImageUrls(rawMobile);
            const desktopUrl = isLocalDesktop ? rawDesktop! : (desktopUrls.primary || desktopUrls.legacy);
            const mobileUrl = isLocalMobile ? rawMobile! : (mobileUrls.primary || mobileUrls.legacy);
            const destination = banner.link_url?.trim() || null;

            const primarySrc = desktopUrl || mobileUrl || "/placeholder.svg";
            const imageContent = desktopUrl || mobileUrl ? (
              <div className="relative h-full w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                <picture className="block h-full w-full">
                  {mobileUrl ? <source media="(max-width: 640px)" srcSet={mobileUrl} /> : null}
                  <img
                    src={primarySrc}
                    alt={`Banner promocional ${banner.position || index + 1}`}
                    className="h-full w-full object-cover object-center transition-transform duration-500 hover:scale-[1.01]"
                    loading={index === 0 ? "eager" : "lazy"}
                    decoding="async"
                    data-fallback-src={desktopUrls.legacy || mobileUrls.legacy || ""}
                    onError={(event) => {
                      const fallback = event.currentTarget.dataset.fallbackSrc;
                      if (!fallback || event.currentTarget.src === fallback) return;
                      event.currentTarget.src = fallback;
                    }}
                  />
                </picture>
              </div>
            ) : (
              <div className="h-full w-full bg-muted" />
            );

            return (
              <div
                key={`${banner.position}-${index}`}
                className="min-w-0 shrink-0 grow-0 basis-full aspect-[16/7] sm:aspect-[1200/380] md:aspect-[1200/350] lg:aspect-[1200/320]"
              >
                {destination ? (
                  <Link
                    to={destination}
                    className="block h-full w-full cursor-pointer"
                    aria-label={`Abrir banner ${banner.position || index + 1}`}
                  >
                    {imageContent}
                  </Link>
                ) : (
                  <div className="h-full w-full">{imageContent}</div>
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
            variant="ghost"
            size="icon"
            className="absolute left-2 sm:left-3 top-1/2 h-7 w-7 sm:h-9 sm:w-9 -translate-y-1/2 rounded-full bg-black/35 hover:bg-black/60 text-white backdrop-blur-md transition-all shadow-sm border-none"
            onClick={() => emblaApi?.scrollPrev()}
            disabled={!canPrev}
            aria-label="Banner anterior"
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 sm:right-3 top-1/2 h-7 w-7 sm:h-9 sm:w-9 -translate-y-1/2 rounded-full bg-black/35 hover:bg-black/60 text-white backdrop-blur-md transition-all shadow-sm border-none"
            onClick={() => emblaApi?.scrollNext()}
            disabled={!canNext}
            aria-label="Próximo banner"
          >
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>

          {/* Dots de navegação na base do banner */}
          <div className="absolute bottom-2.5 sm:bottom-3 inset-x-0 flex items-center justify-center gap-1.5 pointer-events-none">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => emblaApi?.scrollTo(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300 pointer-events-auto",
                  selectedIndex === i
                    ? "w-6 bg-white shadow-md"
                    : "w-1.5 bg-white/60 hover:bg-white/90 shadow-xs",
                )}
                aria-label={`Ir para banner ${i + 1}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
