import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/admin/dashboard", label: "Visão geral", end: true },
  { to: "/admin/dashboard/orcamentos", label: "Orçamentos" },
  { to: "/admin/dashboard/clientes", label: "Clientes" },
  { to: "/admin/dashboard/analytics", label: "Analytics" },
  { to: "/admin/dashboard/tracking", label: "Tracking" },
  { to: "/admin/dashboard/inteligencia", label: "Inteligência" },
];

export default function AdminDashboardShell() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 space-y-5">
      <div className="overflow-x-auto">
        <div className="inline-flex min-w-full gap-2 rounded-2xl border border-border bg-card p-2">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  "rounded-xl px-4 py-2 text-sm font-medium whitespace-nowrap transition-all",
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      </div>

      <Outlet />
    </div>
  );
}
