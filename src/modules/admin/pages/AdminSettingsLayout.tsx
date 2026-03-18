import { Outlet, NavLink } from "react-router-dom";
import { Users, Palette, Plug, Truck, CreditCard, TicketPercent } from "lucide-react";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";

const settingsItems = [
  { label: "Usuários e Acessos", to: "/admin/configuracoes/usuarios", icon: Users, masterOnly: true },
  { label: "Identidade da Loja", to: "/admin/configuracoes/identidade", icon: Palette },
  { label: "Integrações", to: "/admin/configuracoes/integracoes", icon: Plug },
  { label: "Frete", to: "/admin/configuracoes/frete", icon: Truck },
  { label: "Pagamentos", to: "/admin/configuracoes/pagamentos", icon: CreditCard },
  { label: "Cupons", to: "/admin/configuracoes/cupons", icon: TicketPercent },
];

export default function AdminSettingsLayout() {
  const { isMaster } = useAdminPermissions();

  const visibleItems = settingsItems.filter((item) => !item.masterOnly || isMaster);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Ajustes globais do sistema.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <nav className="flex md:flex-col gap-1 overflow-x-auto md:w-56 shrink-0">
          {visibleItems.map((item) => (
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
          ))}
        </nav>

        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
