import { Outlet, NavLink, Routes, Route } from "react-router-dom";
import { LayoutDashboard, Store, Layers, FileCode2, Cpu, Globe, BarChart3, Settings } from "lucide-react";

const MasterAdmin = () => {
  const menuItems = [
    { name: "Dashboard", path: "/admin/master", icon: LayoutDashboard },
    { name: "Lojas", path: "/admin/master/stores", icon: Store },
    { name: "Blueprints", path: "/admin/master/blueprints", icon: Layers },
    { name: "Templates", path: "/admin/master/templates", icon: FileCode2 },
    { name: "Módulos", path: "/admin/master/modules", icon: Cpu },
    { name: "Domínios", path: "/admin/master/domains", icon: Globe },
    { name: "Analytics", path: "/admin/master/analytics", icon: BarChart3 },
  ];

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 border-r bg-card p-4 flex flex-col">
        <h1 className="text-xl font-bold mb-8 px-2">Master Admin</h1>
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/admin/master"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`
              }
            >
              <item.icon size={20} />
              {item.name}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default MasterAdmin;
