import { ReactNode } from "react";
import { StoreTopbar } from "@/components/store/StoreTopbar";
import { StoreMobileChrome } from "@/components/store/mobile/StoreMobileChrome";
import { StoreFooter } from "@/components/store/StoreFooter";
import { CartDrawer } from "@/components/store/CartDrawer";
import { AppDownloadBanner } from "@/components/store/AppDownloadBanner";
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
  return (
    <div className="flex flex-col bg-background w-full overflow-x-hidden">
      <AppDownloadBanner />
      <StoreTopbar
        cartCount={cartCount}
        onCartClick={onCartClick}
        footerStoreName={footerStoreName}
        categories={categories}
      />
      <CartDrawer open={cartOpen} onOpenChange={onCartOpenChange} />
      <StoreMobileChrome cartCount={cartCount} onCartClick={onCartClick} />

      {children}

      {footer !== undefined ? (
        <StoreFooter footer={footer ?? null} pageLinks={pageLinks ?? []} />
      ) : null}
    </div>
  );
}
