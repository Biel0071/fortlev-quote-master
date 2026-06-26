import { useEffect, useRef, useState, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  alt: string;
  /** Show skeleton while loading. Default true. */
  skeleton?: boolean;
  /** Container className (skeleton + image wrapper). */
  wrapperClassName?: string;
  /** Fallback used when image errors. */
  fallback?: string;
};

/**
 * Image with built-in fade-in + skeleton placeholder, preventing the
 * previous frame from "overlapping" while the new src downloads.
 * Defaults to native lazy loading + async decoding for speed.
 */
export function SmartImage({
  src,
  alt,
  className,
  wrapperClassName,
  skeleton = true,
  loading = "lazy",
  decoding = "async",
  fallback = "/placeholder.svg",
  onError,
  onLoad,
  ...rest
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const prevSrc = useRef(src);

  useEffect(() => {
    if (src !== prevSrc.current) {
      prevSrc.current = src;
      setLoaded(false);
      setCurrentSrc(src);
    }
  }, [src]);

  return (
    <div className={cn("relative h-full w-full", wrapperClassName)}>
      {skeleton && !loaded && (
        <div className="absolute inset-0 animate-pulse bg-muted/40" aria-hidden="true" />
      )}
      <img
        {...rest}
        src={currentSrc}
        alt={alt}
        loading={loading}
        decoding={decoding}
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
        onError={(e) => {
          if (currentSrc !== fallback) setCurrentSrc(fallback);
          setLoaded(true);
          onError?.(e);
        }}
        className={cn(
          "transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
      />
    </div>
  );
}

export default SmartImage;
