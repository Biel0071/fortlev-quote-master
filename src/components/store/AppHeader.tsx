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
  return (
    <div id="app-header-root" className="fixed top-0 left-0 right-0 z-[999] w-full bg-background">
      <div className="flex flex-col gap-0">
        {showBanner ? <AppDownloadBanner /> : null}
        <StoreTopbar
          cartCount={cartCount}
          onCartClick={onCartClick}
          footerStoreName={footerStoreName}
          categories={categories}
        />
      </div>
    </div>
  );
}