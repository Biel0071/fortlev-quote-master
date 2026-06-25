import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  CreditCard,
  LayoutDashboard,
  Server,
  ShoppingCart,
  QrCode,
  CreditCard as CardIcon,
  Receipt,
  Split,
  Shield,
  Repeat,
  Globe,
  Key,
  BookOpen,
  TestTube,
  ChevronDown,
  ChevronRight,
  FileCode,
  Webhook,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/contexts/StoreContext";

type NavItem = { label: string; to: string; icon: any };
type NavGroup = { label: string; icon: any; items: NavItem[] };

const BASE = "/configuracoes/pagamentos";

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Gateways",
    icon: Server,
    items: [
      { label: "Todos Gateways", to: `${BASE}/gateways`, icon: Server },
      { label: "Adicionar Gateway", to: `${BASE}/gateways/add`, icon: Server },
    ],
  },
  {
    label: "Checkouts",
    icon: ShoppingCart,
    items: [
      { label: "Checkouts", to: `${BASE}/checkouts`, icon: ShoppingCart },
    ],
  },
  {
    label: "Métodos de Pagamento",
    icon: CreditCard,
    items: [
      { label: "PIX", to: `${BASE}/methods/pix`, icon: QrCode },
      { label: "Cartão", to: `${BASE}/methods/card`, icon: CardIcon },
      { label: "Boleto", to: `${BASE}/methods/boleto`, icon: Receipt },
      { label: "Split", to: `${BASE}/methods/split`, icon: Split },
    ],
  },
  {
    label: "Antifraude",
    icon: Shield,
    items: [
      { label: "Regras", to: `${BASE}/antifraud/rules`, icon: Shield },
    ],
  },
  {
    label: "Assinaturas",
    icon: Repeat,
    items: [
      { label: "Planos", to: `${BASE}/subscriptions/plans`, icon: Repeat },
    ],
  },
  {
    label: "Webhooks",
    icon: Webhook,
    items: [
      { label: "Eventos e Logs", to: `${BASE}/webhooks/events`, icon: Webhook },
    ],
  },
  {
    label: "Desenvolvedor",
    icon: FileCode,
    items: [
      { label: "API Keys", to: `${BASE}/api/keys`, icon: Key },
      { label: "Documentação", to: `${BASE}/api/docs`, icon: BookOpen },
      { label: "Sandbox", to: `${BASE}/api/sandbox`, icon: TestTube },
    ],
  },
];

export default function AdminPaymentsLayout() {
  const nav = useNavigate();
  const location = useLocation();
  const { routes } = useStore();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    NAV_GROUPS.forEach((g) => {
      if (g.items.some((i) => location.pathname.startsWith(routes.adminPath(i.to)))) {
        initial[g.label] = true;
      }
    });
    return initial;
  });

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  const isActive = (path: string) => location.pathname === routes.adminPath(path);

  return (
    <div className="flex min-h-[calc(100vh-3rem)]">
      <aside className="w-64 border-r border-border bg-muted/30 overflow-y-auto shrink-0 hidden md:block">
        <div className="p-4 border-b border-border">
          <h2 className="font-bold text-sm flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Pagamentos
          </h2>
        </div>

        {/* Visão Geral removed — lives in Dashboard now */}

        <nav className="px-2 py-2 space-y-1">
          {NAV_GROUPS.map((group) => {
            const isOpen = openGroups[group.label] ?? false;
            const hasActive = group.items.some((i) => location.pathname.startsWith(routes.adminPath(i.to)));

            return (
              <div key={group.label}>
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                    hasActive
                      ? "text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <group.icon className="h-4 w-4" />
                    {group.label}
                  </span>
                  {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>

                {isOpen && (
                  <div className="ml-4 pl-2 border-l border-border space-y-0.5 mt-0.5">
                    {group.items.map((item) => (
                      <button
                        key={item.to}
                        onClick={() => nav(routes.adminPath(item.to))}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors",
                          isActive(item.to)
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <item.icon className="h-3.5 w-3.5" />
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
