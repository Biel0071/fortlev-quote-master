import { useIsMobile } from "@/hooks/use-mobile";
import { useStoreContact } from "@/hooks/useStoreContact";
import { StoreMobileBottomNav } from "@/components/store/mobile/StoreMobileBottomNav";
import { WhatsAppFab } from "@/components/store/mobile/WhatsAppFab";

export function StoreMobileChrome({
  cartCount,
  onCartClick,
}: {
  cartCount: number;
  onCartClick?: () => void;
}) {
  const isMobile = useIsMobile();
  const contact = useStoreContact();

  if (!isMobile) return null;

  // Place above bottom nav
  const waBottomClass = "bottom-[5.25rem]";

  return (
    <>
      <StoreMobileBottomNav cartCount={cartCount} onCartClick={onCartClick} />
      <WhatsAppFab href={contact.waLink} className={waBottomClass} />
    </>
  );
}
