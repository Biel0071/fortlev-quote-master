import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Building2, Droplets, LayoutGrid, ExternalLink } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const stores = [
  { key: "fortlev" as const, label: "Fortlev (Caixas d’água)", icon: Droplets },
  { key: "construcao" as const, label: "Construção (Materiais)", icon: Building2 },
];

type StoreKey = (typeof stores)[number]["key"];

type SidebarItem = {
  title: string;
  url: string;
  icon: typeof Droplets;
  external?: boolean;
};

function useActiveStore(): StoreKey {
  const location = useLocation();
  if (location.pathname.includes("/dashboard/construcao")) return "construcao";
  return "fortlev";
}

function StoreSidebar({ store }: { store: StoreKey }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const common: SidebarItem[] = [
    {
      title: "Visão geral",
      url: store === "fortlev" ? "/dashboard/fortlev" : "/dashboard/construcao",
      icon: LayoutGrid,
    },
  ];

  const storeSpecific: SidebarItem[] =
    store === "fortlev"
      ? [
          {
            title: "Orçamentos Fortlev",
            url: "/dashboard/fortlev",
            icon: Droplets,
          },
          {
            title: "Abrir (tela cheia)",
            url: "/",
            icon: ExternalLink,
            external: true,
          },
        ]
      : [
          {
            title: "Materiais de Construção",
            url: "/dashboard/construcao",
            icon: Building2,
          },
          {
            title: "Abrir (tela cheia)",
            url: "/construcao",
            icon: ExternalLink,
            external: true,
          },
        ];

  const items = [...common, ...storeSpecific];

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{collapsed ? "" : "Menu"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    {item.external ? (
                      <a
                        href={item.url}
                        className="hover:bg-muted/50"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </a>
                    ) : (
                      <NavLink
                        to={item.url}
                        end
                        className="hover:bg-muted/50"
                        activeClassName="bg-muted text-foreground font-medium"
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    )}
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

export default function StoresDashboardLayout() {
  const navigate = useNavigate();
  const store = useActiveStore();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <StoreSidebar store={store} />

        <div className="flex-1 min-w-0">
          <header className="h-14 flex items-center justify-between gap-3 border-b border-border bg-background px-3 sm:px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <div className="hidden sm:block">
                <div className="text-sm font-medium">Dashboard</div>
                <div className="text-xs text-muted-foreground">Selecione a loja para navegar</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={store}
                onValueChange={(value) => {
                  const next = value as StoreKey;
                  navigate(next === "fortlev" ? "/dashboard/fortlev" : "/dashboard/construcao");
                }}
              >
                <SelectTrigger className="w-[220px] bg-background">
                  <SelectValue placeholder="Selecione a loja" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover">
                  {stores.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button asChild variant="outline" className="hidden sm:inline-flex">
                <NavLink to={store === "fortlev" ? "/dashboard/fortlev" : "/dashboard/construcao"}>
                  Ir
                </NavLink>
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
