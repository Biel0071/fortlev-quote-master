import { memo } from "react";
import { Outlet, Navigate, useNavigate, useLocation } from "react-router-dom";
import { FullScreenLoader } from "@/components/shared/FullScreenLoader";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cloud } from "@/lib/cloud";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useSession } from "@/hooks/useSession";
import { StoreSwitcher } from "@/components/StoreSwitcher";
import { AdminPublishCenter } from "@/modules/admin/components/AdminPublishCenter";
import { useStore } from "@/contexts/StoreContext";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { useStorePermissions } from "@/hooks/useStorePermissions";

type SidebarSubItem = {
  title: string;
  url: string;
  page?: string;
};

type SidebarIcon = typeof LayoutDashboard;

type SidebarItem = {
  title: string;
  url: string;
  icon: SidebarIcon;
  page: string;
  subItems?: SidebarSubItem[];
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
      { title: "Rastreamento", url: "/tracking-dashboard", icon: MapPin, page: "tracking-dashboard" },
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
      { title: "Ofertas", url: "/ofertas", icon: TicketPercent, page: "ofertas" },
    ],
  },
  {
    label: "Inteligência",
    items: [
      { title: "Análise de Clientes", url: "/clientes", icon: Users, page: "clientes" },
      { title: "Funil de Conversão", url: "/funil", icon: Target, page: "funil" },
      { title: "Mapa de Cliques", url: "/mapa-cliques", icon: MousePointerClick, page: "mapa-cliques" },
      {
        title: "APK STUDIO",
        url: "/google-play-studio",
        icon: Smartphone,
        page: "google-play-studio",
        subItems: [
          { title: "Editor da Tela GP", url: "/google-play-studio", page: "google-play-studio" },
          { title: "Métricas & Slugs", url: "/app-metricas", page: "app-metricas" },
        ],
      },
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

const TOP_HUB_ITEMS: Array<{ title: string; url: string; icon: SidebarIcon }> = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Rastreamento", url: "/tracking-dashboard", icon: MapPin },
  { title: "Home da Loja", url: "/home", icon: Home },
  { title: "Pedidos & Coleta", url: "/pedidos", icon: ShoppingBag },
  { title: "Orçamentos", url: "/orcamentos", icon: FileText },
  { title: "Produtos", url: "/produtos", icon: Box },
  { title: "Categorias", url: "/categorias", icon: Tags },
  { title: "Avaliações", url: "/avaliacoes", icon: Star },
  { title: "Cupons", url: "/configuracoes/cupons", icon: TicketPercent },
  { title: "Banners", url: "/banners", icon: ImageIcon },
  { title: "Ofertas", url: "/ofertas", icon: BarChart3 },
  { title: "Análise de Clientes", url: "/clientes", icon: Users },
  { title: "Funil de Conversão", url: "/funil", icon: Target },
  { title: "Mapa de Cliques", url: "/mapa-cliques", icon: MousePointerClick },
  { title: "APK Studio", url: "/google-play-studio", icon: Smartphone },
  { title: "Métricas App", url: "/app-metricas", icon: Store },
  { title: "Insights IA", url: "/insights-ia", icon: Brain },
  { title: "Relatórios IA", url: "/inteligencia-ia", icon: Sparkles },
  { title: "Tema", url: "/tema", icon: Palette },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

const AdminSidebar = memo(function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { canViewPage } = useAdminPermissions();
  const { isPageAllowed } = useStorePermissions();
  const { label, routes } = useStore();
  const nav = useNavigate();
  const location = useLocation();

  // Em ambiente local ou quando ainda não há regras estritas de papéis, mantém os itens sempre acessíveis
  const isDevOrPreview = typeof window !== "undefined" && (
    window.location.hostname === "localhost" ||
    window.location.hostname.includes("127.0.0.1") ||
    window.location.hostname.includes("lovableproject.com") ||
    window.location.hostname.includes("lovable.app") ||
    window.location.hostname.includes("lovable.dev") ||
    window.location.hostname.includes("trycloudflare.com")
  );
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
            isDevOrPreview || ((item.page === "avaliacoes" || canViewPage(item.page)) && isPageAllowed(item.page))
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
                    const hasSubItems = !collapsed && item.subItems && item.subItems.length > 0;
                    const isAnySubActive = item.subItems?.some(
                      (sub) => location.pathname === routes.adminPath(sub.url) || location.pathname.startsWith(routes.adminPath(sub.url) + "/")
                    );
                    const isActive = isAnySubActive || location.pathname === itemUrl || location.pathname.startsWith(itemUrl + "/");

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

                        {/* Submenu de dois cliques / expansão para APK STUDIO */}
                        {hasSubItems && (
                          <SidebarMenuSub className="ml-5 my-1 border-l-2 border-sidebar-border/60 pl-2 space-y-0.5">
                            {item.subItems!.map((sub) => {
                              const subUrl = routes.adminPath(sub.url);
                              const isSubActive = location.pathname === subUrl || location.pathname.startsWith(subUrl + "/");
                              return (
                                <SidebarMenuSubItem key={sub.title}>
                                  <SidebarMenuSubButton asChild>
                                    <NavLink
                                      to={subUrl}
                                      className={`text-xs px-2.5 py-1.5 rounded-md transition-all block ${
                                        isSubActive
                                          ? "text-primary font-bold bg-primary/10 shadow-xs"
                                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                      }`}
                                    >
                                      {sub.title}
                                    </NavLink>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        )}
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
});

export default function AdminLayout() {
  const { user, loading: sessionLoading } = useSession();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const nav = useNavigate();
  const location = useLocation();
  const { routes, label, activeStoreId, storesLoading } = useStore();

  const isStoreSelectorPage = location.pathname === "/admin";
  const isStoreScopedPage = location.pathname.startsWith("/admin/store/");
  const isLegacyAdminPage =
    location.pathname.startsWith("/admin/") &&
    !location.pathname.startsWith("/admin/store/") &&
    !location.pathname.startsWith("/admin/master");

  const isDevOrPreview = typeof window !== "undefined" && (
    window.location.hostname === "localhost" ||
    window.location.hostname.includes("127.0.0.1") ||
    window.location.hostname.includes("lovableproject.com") ||
    window.location.hostname.includes("lovable.app") ||
    window.location.hostname.includes("lovable.dev") ||
    window.location.hostname.includes("trycloudflare.com")
  );
  const isLocalHost = typeof window !== "undefined" && (
    window.location.hostname === "localhost" ||
    window.location.hostname.includes("127.0.0.1")
  );
  const canRender = !sessionLoading && !adminLoading;
  if (!canRender && !isDevOrPreview) return <FullScreenLoader label="Carregando admin..." />;
  if (!user && !isDevOrPreview) return <Navigate to="/auth/login" replace />;
  if (!isAdmin && !isDevOrPreview) {
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

  if (isLegacyAdminPage && activeStoreId && routes.adminBase !== "/admin") {
    const suffix = location.pathname.replace(/^\/admin/, "") || "/dashboard";
    return <Navigate to={`${routes.adminPath(suffix)}${location.search}`} replace />;
  }

  if (isLegacyAdminPage && storesLoading && !isDevOrPreview) {
    return <FullScreenLoader label="Carregando loja..." />;
  }

  if (isStoreScopedPage && storesLoading && !isDevOrPreview) {
    return <FullScreenLoader label="Carregando loja..." />;
  }

  if (isStoreScopedPage && !activeStoreId && !isDevOrPreview) {
    if (!storesLoading) {
      return (
        <div className="min-h-screen bg-background p-6 space-y-4">
          <p className="text-destructive font-medium">Loja não encontrada.</p>
          <Button size="sm" onClick={() => nav("/admin", { replace: true })}>Selecionar loja</Button>
        </div>
      );
    }
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
              {(isAdmin || isLocalHost) && <AdminPublishCenter />}
              <Button variant="outline" size="sm" className="text-xs" onClick={() => nav(routes.publicHome)}>
                Ver loja
              </Button>
              {user ? (
                <Button variant="ghost" size="sm" className="text-xs" onClick={async () => { await cloud.auth.signOut(); nav("/"); }}>
                  Sair
                </Button>
              ) : (
                <Button size="sm" className="text-xs" onClick={() => nav("/auth/login", { state: { from: location.pathname } })}>
                  Entrar Admin
                </Button>
              )}
            </div>
          </header>

          {!user && !sessionLoading && (
            <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between gap-3 text-xs">
              <span className="text-amber-900 dark:text-amber-200">
                Modo visualização sem login ativo: entre como administrador para liberar <strong>Vendas Registradas</strong>, <strong>CRM / Leads</strong>, <strong>Pedidos</strong> e <strong>Publicar</strong>.
              </span>
              <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => nav("/auth/login", { state: { from: location.pathname } })}>
                Fazer login
              </Button>
            </div>
          )}

          {/* Hub Superior Fixo: 2 fileiras de ícones para navegação direta em qualquer página */}
          <nav
            aria-label="Acesso rápido às páginas do painel"
            data-testid="admin-top-icon-hub"
            className="border-b border-border bg-card/90 backdrop-blur-sm px-3 sm:px-4 py-2 sticky top-12 z-20 min-w-0"
          >
            <div className="grid grid-cols-10 gap-1 sm:gap-1.5 max-w-5xl mx-auto">
              {TOP_HUB_ITEMS.map((item) => {
                const fullPath = routes.adminPath(item.url);
                const isActive =
                  location.pathname === fullPath ||
                  (item.url !== "/dashboard" && location.pathname.startsWith(`${fullPath}/`));
                const IconComp = item.icon;
                return (
                  <button
                    key={item.url}
                    type="button"
                    onClick={() => nav(fullPath)}
                    title={item.title}
                    aria-label={item.title}
                    className={`h-8 sm:h-9 w-full rounded-lg flex items-center justify-center border transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary shadow-sm scale-[1.03]"
                        : "bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                    }`}
                  >
                    <IconComp className="h-4 w-4 shrink-0" strokeWidth={2.1} />
                  </button>
                );
              })}
            </div>
          </nav>

          <main className="min-w-0 max-w-full flex-1 overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
