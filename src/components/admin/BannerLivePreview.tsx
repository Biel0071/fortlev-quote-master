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
  mobileSrc?: string | null;
  legacySrc?: string | null;
  size: BannerPreviewSize;
};

export function BannerLivePreview({
  title,
  subtitle,
  buttonLabel,
  linkUrl,
  desktopSrc,
  mobileSrc,
  legacySrc,
  size,
}: Props) {
  const desktop = desktopSrc || legacySrc || "";
  const mobile = mobileSrc || legacySrc || "";
  const hasImage = Boolean(desktop || mobile);

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
            <img src={desktop || mobile} alt={title || "Preview do banner"} className="h-full w-full object-cover" loading="lazy" />
          </picture>
        ) : (
          <div className="h-full w-full bg-muted" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/30 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-5">
          <h3 className="text-base sm:text-lg font-bold leading-tight text-foreground line-clamp-2">
            {title || "Título do banner"}
          </h3>
          {subtitle ? <p className="mt-1 text-xs sm:text-sm text-muted-foreground line-clamp-2">{subtitle}</p> : null}

          <div className="mt-3 inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs sm:text-sm font-semibold text-primary-foreground">
            {buttonLabel || "Ver ofertas"}
          </div>
        </div>
      </div>

      <div className="mt-2 text-xs text-muted-foreground">Escala visual do tamanho selecionado. Link: {linkUrl || "/loja"}</div>
    </div>
  );
}
