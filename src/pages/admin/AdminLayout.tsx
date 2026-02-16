import { Outlet, Navigate, useNavigate } from "react-router-dom";
import {
  Package,
  LayoutGrid,
  Tags,
  ShoppingBag,
  Users,
  TicketPercent,
  Image as ImageIcon,
  Settings,
  Home,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cloud } from "@/lib/cloud";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useSession } from "@/hooks/useSession";

const items = [
  { title: "Dashboard", url: "/admin/dashboard", icon: LayoutGrid },
  { title: "Home", url: "/admin/home", icon: Home },
  { title: "Produtos", url: "/admin/produtos", icon: Package },
  { title: "Categorias", url: "/admin/categorias", icon: Tags },
  { title: "Pedidos", url: "/admin/pedidos", icon: ShoppingBag },
  { title: "Clientes", url: "/admin/clientes", icon: Users },
  { title: "Cupons", url: "/admin/cupons", icon: TicketPercent },
  { title: "Banners", url: "/admin/banners", icon: ImageIcon },
  { title: "Configurações", url: "/admin/configuracoes", icon: Settings },
];

function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{collapsed ? "" : "Admin"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-foreground font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export default function AdminLayout() {
  const { user, loading: sessionLoading } = useSession();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const nav = useNavigate();

  const canRender = !sessionLoading && !adminLoading;
  if (!canRender) return <div className="p-6 text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/auth/login" replace />;
  if (!isAdmin) return <div className="p-6 text-destructive">Acesso negado.</div>;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />

        <div className="flex-1 min-w-0">
          <header className="h-14 flex items-center justify-between gap-3 border-b border-border bg-background/80 backdrop-blur px-3 sm:px-4">
            <div className="flex items-center gap-2 min-w-0">
              <SidebarTrigger />
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">Painel administrativo</div>
                <div className="text-xs text-muted-foreground truncate">Controle total da loja</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => nav("/")}>Ver loja</Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await cloud.auth.signOut();
                  nav("/");
                }}
              >
                Sair
              </Button>
            </div>
          </header>

          <main className="min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
