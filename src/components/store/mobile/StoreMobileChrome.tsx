import { useIsMobile } from "@/hooks/use-mobile";
import { StoreMobileBottomNav } from "@/components/store/mobile/StoreMobileBottomNav";

export function StoreMobileChrome({
  cartCount,
  onCartClick,
}: {
  cartCount: number;
  onCartClick?: () => void;
}) {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return <StoreMobileBottomNav cartCount={cartCount} onCartClick={onCartClick} />;
}
