import { ReactNode, useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/store/AppHeader";
import { StoreMobileChrome } from "@/components/store/mobile/StoreMobileChrome";
import { StoreFooter } from "@/components/store/StoreFooter";
import { CartDrawer } from "@/components/store/CartDrawer";
import type { HomeFooter } from "@/hooks/useHomeContent";

/**
 * Shared shell for all store pages.
 * Renders header, mobile bottom nav, cart drawer, footer.
 */
export function StoreLayout({
  children,
  cartCount,
  onCartClick,
  cartOpen,
  onCartOpenChange,
  footer,
  pageLinks,
  footerStoreName,
  categories,
}: {
  children: ReactNode;
  cartCount: number;
  onCartClick?: () => void;
  cartOpen: boolean;
  onCartOpenChange: (open: boolean) => void;
  footer?: HomeFooter | null;
  pageLinks?: Array<{ title: string; slug: string }>;
  footerStoreName?: string;
  categories?: Array<{ id: string; name: string; slug: string }>;
}) {
  const [headerH, setHeaderH] = useState(0);

  useEffect(() => {
    const el = document.getElementById("app-header-root");
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setHeaderH(entry.contentRect.height));
    ro.observe(el);
    setHeaderH(el.getBoundingClientRect().height);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="flex flex-col bg-background w-full overflow-x-hidden">
      <AppHeader
        cartCount={cartCount}
        onCartClick={onCartClick}
        footerStoreName={footerStoreName}
        categories={categories}
      />
      <CartDrawer open={cartOpen} onOpenChange={onCartOpenChange} />
      <StoreMobileChrome cartCount={cartCount} onCartClick={onCartClick} />

      <div style={{ paddingTop: headerH }}>
        {children}
      </div>

      {footer !== undefined ? (
        <StoreFooter footer={footer ?? null} pageLinks={pageLinks ?? []} />
      ) : null}
    </div>
  );
}
