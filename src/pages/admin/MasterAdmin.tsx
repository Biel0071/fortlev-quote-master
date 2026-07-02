import { lazy, Suspense } from "react";
import { NavLink, Routes, Route, Navigate } from "react-router-dom";
import { LayoutDashboard, Store, Layers, FileCode2, Cpu, Globe, BarChart3, Settings, ShieldCheck, Activity, Sparkles, CreditCard, DollarSign, Palette, Rocket, GitBranch, Server, Box, AlertTriangle, Database, Gauge } from "lucide-react";

const MasterDashboard = lazy(() => import("@/components/admin/master/MasterDashboard"));
const StoresList = lazy(() => import("@/components/admin/master/StoresList"));
const BlueprintsManager = lazy(() => import("@/components/admin/master/BlueprintsManager"));
const ModulesManager = lazy(() => import("@/components/admin/master/ModulesManager"));
const MasterAICentral = lazy(() => import("@/components/admin/master/MasterAICentral"));
const MasterLogs = lazy(() => import("@/components/admin/master/MasterLogs"));
const SaaSPlansManager = lazy(() => import("@/components/admin/master/SaaSPlansManager"));
const FinanceManager = lazy(() => import("@/components/admin/master/FinanceManager"));
const WhiteLabelSettings = lazy(() => import("@/components/admin/master/WhiteLabelSettings"));
const DomainsManager = lazy(() => import("@/components/admin/master/DomainsManager"));
const StoreDetails = lazy(() => import("@/components/admin/master/StoreDetails"));
const DeployCenter = lazy(() => import("@/components/admin/master/platform/DeployCenter"));
const VersionCenter = lazy(() => import("@/components/admin/master/platform/VersionCenter"));
const ServersManager = lazy(() => import("@/components/admin/master/platform/ServersManager"));
const ContainersView = lazy(() => import("@/components/admin/master/platform/ContainersView"));
const AlertsCenter = lazy(() => import("@/components/admin/master/platform/AlertsCenter"));
const BackupsCenter = lazy(() => import("@/components/admin/master/platform/BackupsCenter"));
const MonitoringDashboard = lazy(() => import("@/components/admin/master/platform/MonitoringDashboard"));

function MasterPlaceholder({ title }: { title: string }) {
  return (
    <div className="space-y-2">
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground">Área master carregada e pronta para configuração.</p>
    </div>
  );
}

function MasterRouteFallback() {
  return <div className="p-6 text-sm text-muted-foreground">Carregando área master...</div>;
}

const MasterAdmin = () => {
  const menuItems = [
    { name: "Dashboard", path: "/admin/master", icon: LayoutDashboard, section: "Geral" },
    { name: "Lojas", path: "/admin/master/stores", icon: Store, section: "Geral" },
    { name: "Planos SaaS", path: "/admin/master/plans", icon: CreditCard, section: "Geral" },
    { name: "Financeiro", path: "/admin/master/finance", icon: DollarSign, section: "Geral" },
    { name: "Deploy Center", path: "/admin/master/deploy", icon: Rocket, section: "Plataforma" },
    { name: "Versões", path: "/admin/master/versions", icon: GitBranch, section: "Plataforma" },
    { name: "Servidores", path: "/admin/master/servers", icon: Server, section: "Plataforma" },
    { name: "Containers", path: "/admin/master/containers", icon: Box, section: "Plataforma" },
    { name: "Monitoramento", path: "/admin/master/monitoring", icon: Gauge, section: "Plataforma" },
    { name: "Alertas", path: "/admin/master/alerts", icon: AlertTriangle, section: "Plataforma" },
    { name: "Backups", path: "/admin/master/backups", icon: Database, section: "Plataforma" },
    { name: "Domínios", path: "/admin/master/domains", icon: Globe, section: "Plataforma" },
    { name: "Blueprints", path: "/admin/master/blueprints", icon: Layers, section: "Config" },
    { name: "Templates", path: "/admin/master/templates", icon: FileCode2, section: "Config" },
    { name: "Módulos", path: "/admin/master/modules", icon: Cpu, section: "Config" },
    { name: "IA Central", path: "/admin/master/ia", icon: Sparkles, section: "Config" },
    { name: "White Label", path: "/admin/master/whitelabel", icon: Palette, section: "Config" },
    { name: "Analytics", path: "/admin/master/analytics", icon: BarChart3, section: "Config" },
    { name: "Logs", path: "/admin/master/logs", icon: Activity, section: "Config" },
  ];

  const sections = ["Geral", "Plataforma", "Config"] as const;

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 border-r bg-card p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-8 px-2 text-primary">
          <ShieldCheck size={24} />
          <h1 className="text-xl font-bold">Master Admin</h1>
        </div>
        <nav className="space-y-4 flex-1 overflow-y-auto">
          {sections.map((section) => (
            <div key={section}>
              <div className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{section}</div>
              <div className="space-y-1">
                {menuItems.filter((i) => i.section === section).map((item) => (
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
              </div>
            </div>
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
          <Suspense fallback={<MasterRouteFallback />}>
            <Routes>
              <Route index element={<MasterDashboard />} />
              <Route path="stores" element={<StoresList />} />
              <Route path="stores/:storeId" element={<StoreDetails />} />
              <Route path="plans" element={<SaaSPlansManager />} />
              <Route path="finance" element={<FinanceManager />} />
              <Route path="blueprints" element={<BlueprintsManager />} />
              <Route path="templates" element={<MasterPlaceholder title="Templates" />} />
              <Route path="modules" element={<ModulesManager />} />
              <Route path="ia" element={<MasterAICentral />} />
              <Route path="whitelabel" element={<WhiteLabelSettings />} />
              <Route path="domains" element={<DomainsManager />} />
              <Route path="deploy" element={<DeployCenter />} />
              <Route path="versions" element={<VersionCenter />} />
              <Route path="servers" element={<ServersManager />} />
              <Route path="containers" element={<ContainersView />} />
              <Route path="monitoring" element={<MonitoringDashboard />} />
              <Route path="alerts" element={<AlertsCenter />} />
              <Route path="backups" element={<BackupsCenter />} />
              <Route path="analytics" element={<MasterPlaceholder title="Analytics Master" />} />
              <Route path="logs" element={<MasterLogs />} />
              {/* Fallback */}
              <Route path="*" element={<Navigate to="/admin/master" replace />} />
            </Routes>
          </Suspense>
        </div>
      </main>
    </div>
  );
};

export default MasterAdmin;
