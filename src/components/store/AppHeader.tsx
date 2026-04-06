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
    <div className="sticky top-0 z-[999] w-full bg-background">
      <div className="flex flex-col gap-1">
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