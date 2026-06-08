import { Outlet, NavLink, Routes, Route, Navigate } from "react-router-dom";
import { LayoutDashboard, Store, Layers, FileCode2, Cpu, Globe, BarChart3, Settings, ShieldCheck, Activity, Sparkles, CreditCard, DollarSign, Palette } from "lucide-react";
import MasterDashboard from "@/components/admin/master/MasterDashboard";
import StoresList from "@/components/admin/master/StoresList";
import BlueprintsManager from "@/components/admin/master/BlueprintsManager";
import ModulesManager from "@/components/admin/master/ModulesManager";
import MasterAICentral from "@/components/admin/master/MasterAICentral";
import MasterLogs from "@/components/admin/master/MasterLogs";
import SaaSPlansManager from "@/components/admin/master/SaaSPlansManager";
import FinanceManager from "@/components/admin/master/FinanceManager";
import WhiteLabelSettings from "@/components/admin/master/WhiteLabelSettings";
import DomainsManager from "@/components/admin/master/DomainsManager";

const MasterAdmin = () => {
  const menuItems = [
    { name: "Dashboard", path: "/admin/master", icon: LayoutDashboard },
    { name: "Lojas", path: "/admin/master/stores", icon: Store },
    { name: "Planos SaaS", path: "/admin/master/plans", icon: CreditCard },
    { name: "Financeiro", path: "/admin/master/finance", icon: DollarSign },
    { name: "Blueprints", path: "/admin/master/blueprints", icon: Layers },
    { name: "Templates", path: "/admin/master/templates", icon: FileCode2 },
    { name: "Módulos", path: "/admin/master/modules", icon: Cpu },
    { name: "IA Central", path: "/admin/master/ia", icon: Sparkles },
    { name: "White Label", path: "/admin/master/whitelabel", icon: Palette },
    { name: "Domínios", path: "/admin/master/domains", icon: Globe },
    { name: "Analytics", path: "/admin/master/analytics", icon: BarChart3 },
    { name: "Logs", path: "/admin/master/logs", icon: Activity },
  ];

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 border-r bg-card p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-8 px-2 text-primary">
          <ShieldCheck size={24} />
          <h1 className="text-xl font-bold">Master Admin</h1>
        </div>
        <nav className="space-y-1 flex-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/admin/master"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`
              }
            >
              <item.icon size={18} />
              {item.name}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t pt-4">
          <NavLink
            to="/admin"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Settings size={18} />
            Voltar ao Admin Loja
          </NavLink>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-muted/20">
        <div className="container mx-auto py-8 px-8">
          <Routes>
            <Route index element={<MasterDashboard />} />
            <Route path="stores" element={<StoresList />} />
            <Route path="plans" element={<SaaSPlansManager />} />
            <Route path="finance" element={<FinanceManager />} />
            <Route path="blueprints" element={<BlueprintsManager />} />
            <Route path="modules" element={<ModulesManager />} />
            <Route path="ia" element={<MasterAICentral />} />
            <Route path="whitelabel" element={<WhiteLabelSettings />} />
            <Route path="domains" element={<DomainsManager />} />
            <Route path="logs" element={<MasterLogs />} />
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/admin/master" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default MasterAdmin;
