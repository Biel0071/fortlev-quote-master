import { ReactNode } from "react";
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
  hideFooter = false,
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
  hideFooter?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background w-full overflow-x-hidden">
      <AppHeader
        cartCount={cartCount}
        onCartClick={onCartClick}
        footerStoreName={footerStoreName}
        categories={categories}
      />
      <CartDrawer open={cartOpen} onOpenChange={onCartOpenChange} />
      <StoreMobileChrome cartCount={cartCount} onCartClick={onCartClick} />

      <div className="main-content flex-1">
        {children}
      </div>

      {!hideFooter ? <StoreFooter footer={footer} pageLinks={pageLinks} /> : null}
    </div>
  );
}
