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

    const updateHeight = () => {
      const height = Math.ceil(root.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--store-header-offset", `${height}px`);
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(root);
    window.addEventListener("resize", updateHeight);

    return () => {
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