import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  Users, Palette, Plug, Truck, CreditCard, TicketPercent,
  Server, ShoppingCart, QrCode, Shield, Repeat, Webhook, FileCode,
  ChevronDown, ChevronRight,
} from "lucide-react";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { useState } from "react";
import { cn } from "@/lib/utils";

type SettingsItem = {
  label: string;
  to: string;
  icon: any;
  masterOnly?: boolean;
  children?: { label: string; to: string; icon: any }[];
};

const BASE = "/admin/configuracoes/pagamentos";

const settingsItems: SettingsItem[] = [
  { label: "Usuários e Acessos", to: "/admin/configuracoes/usuarios", icon: Users, masterOnly: true },
  { label: "Identidade da Loja", to: "/admin/configuracoes/identidade", icon: Palette },
  { label: "Integrações", to: "/admin/configuracoes/integracoes", icon: Plug },
  { label: "Frete", to: "/admin/configuracoes/frete", icon: Truck },
  { label: "Cupons", to: "/admin/configuracoes/cupons", icon: TicketPercent },
  {
    label: "Pagamentos",
    to: `${BASE}/gateways`,
    icon: CreditCard,
    children: [
      { label: "Gateways", to: `${BASE}/gateways`, icon: Server },
      { label: "Checkouts", to: `${BASE}/checkouts`, icon: ShoppingCart },
      { label: "Métodos", to: `${BASE}/methods`, icon: QrCode },
      { label: "Antifraude", to: `${BASE}/antifraud/rules`, icon: Shield },
      { label: "Assinaturas", to: `${BASE}/subscriptions/plans`, icon: Repeat },
      { label: "Webhooks", to: `${BASE}/webhooks/events`, icon: Webhook },
      { label: "Desenvolvedor", to: `${BASE}/api/keys`, icon: FileCode },
    ],
  },
];

export default function AdminSettingsLayout() {
  const { isMaster } = useAdminPermissions();
  const location = useLocation();

  const visibleItems = settingsItems.filter((item) => !item.masterOnly || isMaster);

  const paymentsActive = location.pathname.startsWith(BASE);
  const [paymentsOpen, setPaymentsOpen] = useState(paymentsActive);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Ajustes globais do sistema.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <nav className="flex md:flex-col gap-1 overflow-x-auto md:w-56 shrink-0">
          {visibleItems.map((item) => {
            if (item.children) {
              const isOpen = paymentsOpen;
              return (
                <div key={item.label}>
                  <button
                    onClick={() => setPaymentsOpen(!isOpen)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors",
                      paymentsActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  </button>
                  {isOpen && (
                    <div className="ml-4 pl-2 border-l border-border space-y-0.5 mt-1 mb-1">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors",
                              isActive
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-muted-foreground hover:bg-muted/50"
                            )
                          }
                        >
                          <child.icon className="h-3.5 w-3.5" />
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted/50"
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
