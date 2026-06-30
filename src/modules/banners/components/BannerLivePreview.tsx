import { Badge } from "@/components/ui/badge";

export type BannerPreviewSize = {
  key: string;
  label: string;
  width: number;
  height: number;
};

export const BANNER_PRESET_SIZES: BannerPreviewSize[] = [
  { key: "hero-desktop", label: "Hero Desktop", width: 1920, height: 560 },
  { key: "desktop-large", label: "Desktop Grande", width: 1440, height: 520 },
  { key: "desktop-standard", label: "Desktop Padrão", width: 1200, height: 420 },
  { key: "mobile-banner", label: "Mobile Banner", width: 390, height: 220 },
  { key: "mobile-tall", label: "Mobile Alto", width: 390, height: 280 },
];

type Props = {
  title: string;
  subtitle?: string | null;
  buttonLabel?: string | null;
  linkUrl?: string | null;
  desktopSrc?: string | null;
  desktopFallbackSrc?: string | null;
  mobileSrc?: string | null;
  mobileFallbackSrc?: string | null;
  legacySrc?: string | null;
  size: BannerPreviewSize;
};

export function BannerLivePreview({
  title,
  subtitle,
  buttonLabel,
  linkUrl,
  desktopSrc,
  desktopFallbackSrc,
  mobileSrc,
  mobileFallbackSrc,
  legacySrc,
  size,
}: Props) {
  const desktop = desktopSrc || legacySrc || "";
  const desktopFallback = desktopFallbackSrc || legacySrc || "";
  const mobile = mobileSrc || legacySrc || "";
  const mobileFallback = mobileFallbackSrc || legacySrc || "";
  const hasImage = Boolean(desktop || mobile);

  const safeTitle = title?.trim() ?? "";
  const safeSubtitle = subtitle?.trim() ?? "";
  const safeButton = buttonLabel?.trim() ?? "";
  const hasOverlayContent = Boolean(safeTitle || safeSubtitle || safeButton);

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Preview</span>
        <Badge variant="secondary" className="font-mono">
          {size.width}×{size.height}px
        </Badge>
      </div>

      <div
        className="relative mt-3 w-full overflow-hidden rounded-lg border border-border bg-muted/20"
        style={{ aspectRatio: `${size.width}/${size.height}` }}
      >
        {hasImage ? (
          <picture>
            {mobile ? <source media="(max-width: 640px)" srcSet={mobile} /> : null}
            <img
              src={desktop || mobile}
              alt={safeTitle || "Preview do banner"}
              className="h-full w-full object-contain"
              loading="lazy"
              data-fallback-src={desktopFallback || mobileFallback}
              onError={(event) => {
                const fallback = event.currentTarget.dataset.fallbackSrc;
                if (!fallback) return;
                if (event.currentTarget.src === fallback) return;
                event.currentTarget.src = fallback;
              }}
            />
          </picture>
        ) : (
          <div className="h-full w-full bg-muted" />
        )}

        {hasOverlayContent ? <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/30 to-transparent" /> : null}

        {hasOverlayContent ? (
          <div className="absolute inset-x-0 bottom-0 p-3 sm:p-5">
            {safeTitle ? <h3 className="text-base sm:text-lg font-bold leading-tight text-foreground line-clamp-2">{safeTitle}</h3> : null}
            {safeSubtitle ? <p className="mt-1 text-xs sm:text-sm text-foreground/90 line-clamp-2">{safeSubtitle}</p> : null}
            {safeButton ? (
              <div className="mt-3 inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs sm:text-sm font-semibold text-primary-foreground">
                {safeButton}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-2 text-xs text-muted-foreground">Escala visual do tamanho selecionado. Link: {linkUrl || "/loja"}</div>
    </div>
  );
}
