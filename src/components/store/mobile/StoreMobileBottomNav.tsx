import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, LayoutGrid, ShoppingCart, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function StoreMobileBottomNav({
  cartCount,
  onCartClick,
}: {
  cartCount: number;
  onCartClick?: () => void;
}) {
  const nav = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === "/" || location.pathname === "/materiais";
  const isCatalog = location.pathname === "/loja";
  const isCart = location.pathname === "/carrinho";
  const isAccount = location.pathname === "/conta";

  const items = [
    { label: "Home", icon: Home, active: isHome, onClick: () => nav("/materiais") },
    {
      label: "Carrinho",
      icon: ShoppingCart,
      active: isCart,
      badge: cartCount,
      onClick: () => {
        if (onCartClick) onCartClick();
        else nav("/carrinho");
      },
    },
  ];

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 md:hidden",
        "border-t border-border bg-background/95 backdrop-blur-md",
      )}
      role="navigation"
      aria-label="Navegação"
    >
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1.5 text-[11px] font-medium transition-colors min-w-[60px]",
                item.active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {(item as any).badge > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 min-w-[18px] rounded-full bg-primary px-1 py-0.5 text-[9px] font-bold text-primary-foreground text-center leading-none">
                    {(item as any).badge}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
      {/* Safe area for iOS */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
