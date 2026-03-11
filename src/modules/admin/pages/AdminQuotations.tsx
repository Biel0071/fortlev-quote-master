import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { FileText, Droplets, HardHat } from "lucide-react";

const tabs = [
  { to: "/admin/orcamentos", label: "Visão Geral", icon: FileText, end: true },
  { to: "/admin/orcamentos/fortlev", label: "Fortlev", icon: Droplets },
  { to: "/admin/orcamentos/construcao", label: "Construção", icon: HardHat },
];

export default function AdminQuotations() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 space-y-5">
      <h1 className="text-xl font-bold">Orçamentos</h1>

      <div className="overflow-x-auto">
        <div className="inline-flex min-w-full gap-2 rounded-2xl border border-border bg-card p-2">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  "rounded-xl px-4 py-2 text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )
              }
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </NavLink>
          ))}
        </div>
      </div>

      <Outlet />
    </div>
  );
}
