import { useEffect, useRef } from "react";
import { AppDownloadBanner } from "@/components/store/AppDownloadBanner";
import { StoreTopbar } from "@/components/store/StoreTopbar";

type AppHeaderProps = {
  cartCount: number;
  onCartClick?: () => void;
  footerStoreName?: string;
  categories?: Array<{ id: string; name: string; slug: string }>;
  showBanner?: boolean;
};

export function AppHeader({
  cartCount,
  onCartClick,
  footerStoreName,
  categories,
  showBanner = true,
}: AppHeaderProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let lastHeight = 0;
    const updateHeight = () => {
      const height = Math.ceil(root.getBoundingClientRect().height);
      if (height > 0 && Math.abs(height - lastHeight) > 1) {
        lastHeight = height;
        document.documentElement.style.setProperty("--store-header-offset", `${height}px`);
      }
    };

    // Initial check
    const timeoutId = setTimeout(updateHeight, 100);

    const resizeObserver = new ResizeObserver(() => {
      // Use requestAnimationFrame to avoid "ResizeObserver loop limit exceeded"
      window.requestAnimationFrame(updateHeight);
    });

    resizeObserver.observe(root);
    window.addEventListener("resize", updateHeight);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, [showBanner, categories?.length, footerStoreName]);

  return (
    <div ref={rootRef} id="app-header-root" className="fixed top-0 left-0 right-0 z-[9999] w-full bg-background shadow-sm">
      {showBanner ? <AppDownloadBanner /> : null}
      <StoreTopbar
        cartCount={cartCount}
        onCartClick={onCartClick}
        footerStoreName={footerStoreName}
        categories={categories}
      />
    </div>
  );
}