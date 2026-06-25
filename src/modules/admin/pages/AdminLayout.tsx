import { Outlet, Navigate, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  Box,
  Brain,
  FileText,
  Home,
  Image as ImageIcon,
  LayoutDashboard,
  MapPin,
  MousePointerClick,
  Palette,
  Settings,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Star,
  Store,
  Tags,
  Target,
  TicketPercent,
  Users,
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
import { StoreSwitcher } from "@/components/StoreSwitcher";
import { useStore } from "@/contexts/StoreContext";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { useStorePermissions } from "@/hooks/useStorePermissions";

type SidebarItem = {
  title: string;
  url: string;
  icon: any;
  page: string;
};

type SidebarSection = {
  label: string;
  items: SidebarItem[];
};

const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    label: "Visão Geral",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, page: "dashboard" },
      { title: "Home", url: "/home", icon: Home, page: "home" },
    ],
  },
  {
    label: "Vendas",
    items: [
      { title: "Pedidos", url: "/pedidos", icon: ShoppingBag, page: "pedidos" },
      { title: "Orçamentos", url: "/orcamentos", icon: FileText, page: "orcamentos" },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { title: "Produtos", url: "/produtos", icon: Box, page: "produtos" },
      { title: "Categorias", url: "/categorias", icon: Tags, page: "categorias" },
      { title: "Avaliações", url: "/avaliacoes", icon: Star, page: "avaliacoes" },
      { title: "Cupons", url: "/configuracoes/cupons", icon: TicketPercent, page: "cupons" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { title: "Banners", url: "/banners", icon: ImageIcon, page: "banners" },
    ],
  },
  {
    label: "Inteligência",
    items: [
      { title: "Análise de Clientes", url: "/clientes", icon: Users, page: "clientes" },
      { title: "Funil de Conversão", url: "/funil", icon: Target, page: "funil" },
      { title: "Mapa de Cliques", url: "/mapa-cliques", icon: MapPin, page: "mapa-cliques" },
      { title: "Métricas do App", url: "/app-metricas", icon: Smartphone, page: "app-metricas" },
      { title: "Insights IA", url: "/insights-ia", icon: Brain, page: "insights-ia" },
      { title: "Análise e Relatórios IA", url: "/inteligencia-ia", icon: Sparkles, page: "inteligencia-ia" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { title: "Tema", url: "/tema", icon: Palette, page: "tema" },
      { title: "Configurações", url: "/configuracoes", icon: Settings, page: "configuracoes" },
    ],
  },
];

function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { canViewPage } = useAdminPermissions();
  const { isPageAllowed } = useStorePermissions();
  const { label, routes } = useStore();
  const nav = useNavigate();
  const location = useLocation();
  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarContent className="gap-0">
        {/* Store identity */}
        <SidebarGroup className="border-b border-border pb-2">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => nav("/admin")} className="hover:bg-primary/5 transition-colors">
                  <Store className="mr-2 h-4 w-4 text-primary" />
                  {!collapsed && <span className="text-xs font-semibold truncate">{label}</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Grouped menu sections */}
        {SIDEBAR_SECTIONS.map((section) => {
          const visibleItems = section.items.filter((item) =>
            (item.page === "avaliacoes" || canViewPage(item.page)) && isPageAllowed(item.page)
          );
          if (!visibleItems.length) return null;

          return (
            <SidebarGroup key={section.label} className="py-1">
              {!collapsed && (
                <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/60 font-semibold px-3 mb-0.5">
                  {section.label}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => {
                    const itemUrl = routes.adminPath(item.url);
                    const isActive = location.pathname === itemUrl || location.pathname.startsWith(itemUrl + "/");
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={itemUrl}
                            end={item.url === "/dashboard"}
                            className={`relative transition-all duration-150 rounded-lg mx-1 ${
                              isActive
                                ? "bg-sidebar-accent text-sidebar-primary font-semibold shadow-sm"
                                : "hover:bg-sidebar-accent/60 text-sidebar-foreground/90 hover:text-sidebar-foreground"
                            }`}
                            activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                          >
                            <item.icon className={`mr-2 h-4 w-4 ${isActive ? "text-sidebar-primary" : "text-sidebar-foreground/70"}`} />
                            {!collapsed && <span className="text-[13px]">{item.title}</span>}
                            {isActive && !collapsed && (
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-sidebar-primary rounded-r-full" />
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}

export default function AdminLayout() {
  const { user, loading: sessionLoading } = useSession();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const nav = useNavigate();
  const location = useLocation();
  const { routes, label, activeStoreId } = useStore();

  const isStoreSelectorPage = location.pathname === "/admin";

  const canRender = !sessionLoading && !adminLoading;
  if (!canRender) return <div className="p-6 text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/auth/login" replace />;
  if (!isAdmin) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-destructive">Acesso negado.</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => nav("/")}>Voltar à loja</Button>
          <Button size="sm" onClick={async () => { await cloud.auth.signOut(); nav("/auth/login", { replace: true }); }}>
            Entrar com outra conta
          </Button>
        </div>
      </div>
    );
  }

  if (isStoreSelectorPage) {
    return (
      <div className="min-h-screen bg-background">
        <header className="h-14 flex items-center justify-between gap-3 border-b border-border bg-background/80 backdrop-blur px-3 sm:px-4">
          <div className="flex items-center gap-2 min-w-0">
            <Store className="w-5 h-5 text-primary shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">Painel administrativo</div>
              <div className="text-xs text-muted-foreground truncate">Seleção de loja</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => nav("/")}>Ver loja</Button>
            <Button variant="ghost" size="sm" onClick={async () => { await cloud.auth.signOut(); nav("/"); }}>Sair</Button>
          </div>
        </header>
        <main><Outlet /></main>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />

        <div className="flex-1 min-w-0 flex flex-col">
          <header className="h-12 flex items-center justify-between gap-3 border-b border-border bg-background/95 backdrop-blur-sm px-3 sm:px-4 sticky top-0 z-30">
            <div className="flex items-center gap-2 min-w-0">
              <SidebarTrigger />
              {location.pathname !== routes.dashboard && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => nav(-1)} title="Voltar">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="hidden sm:block min-w-0">
                <div className="text-sm font-medium truncate">{label}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden md:block">
                <StoreSwitcher className="w-[220px] bg-background" />
              </div>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => nav(routes.publicHome)}>
                Ver loja
              </Button>
              <Button variant="ghost" size="sm" className="text-xs" onClick={async () => { await cloud.auth.signOut(); nav("/"); }}>
                Sair
              </Button>
            </div>
          </header>

          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
