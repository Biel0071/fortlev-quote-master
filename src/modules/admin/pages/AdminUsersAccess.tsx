import { useState, useEffect, useCallback } from "react";
import { cloud } from "@/lib/cloud";
import { useSession } from "@/hooks/useSession";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Ban,
  RotateCcw,
  KeyRound,
  Eye,
  Search,
  Crown,
} from "lucide-react";

type AdminUser = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  created_by: string | null;
  created_at: string;
};

type Store = {
  id: string;
  name: string;
  slug: string;
};

const ALL_PAGES = [
  "dashboard",
  "home",
  "orcamentos",
  "produtos",
  "categorias",
  "pedidos",
  "clientes",
  "cupons",
  "banners",
  "tema",
  "analise-ia",
  "analytics",
  "tracking",
  "configuracoes",
] as const;

const PAGE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  home: "Home",
  orcamentos: "Orçamentos",
  produtos: "Produtos",
  categorias: "Categorias",
  pedidos: "Pedidos",
  clientes: "Clientes",
  cupons: "Cupons",
  banners: "Banners",
  tema: "Tema",
  "analise-ia": "Análise IA",
  analytics: "Analytics",
  tracking: "Tracking",
  configuracoes: "Configurações",
};

const DETAIL_PAGES = ["produtos", "pedidos", "clientes", "cupons"] as const;

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: typeof Shield }> = {
  master: { label: "MASTER", color: "text-destructive", icon: Crown },
  admin: { label: "ADMIN", color: "text-primary", icon: ShieldCheck },
  gerente: { label: "GERENTE", color: "text-amber-600", icon: ShieldAlert },
  operator: { label: "OPERADOR", color: "text-muted-foreground", icon: Shield },
  visualizador: { label: "VISUALIZADOR", color: "text-muted-foreground/70", icon: Eye },
};

const roleIcon = (role: string) => {
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.operator;
  const Icon = cfg.icon;
  return <Icon className={`h-4 w-4 ${cfg.color}`} />;
};

const roleBadge = (role: string) => {
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.operator;
  const variant =
    role === "master"
      ? "destructive"
      : role === "admin"
        ? "default"
        : role === "gerente"
          ? "outline"
          : "secondary";
  return <Badge variant={variant}>{cfg.label}</Badge>;
};

export default function AdminUsersAccess() {
  const { user } = useSession();
  const { isMaster } = useAdminPermissions();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStore, setFilterStore] = useState<string>("all");

  // Invite form state
  const [invName, setInvName] = useState("");
  const [invEmail, setInvEmail] = useState("");
  const [invRole, setInvRole] = useState<string>("operator");
  const [invStores, setInvStores] = useState<string[]>([]);
  const [invPages, setInvPages] = useState<string[]>([...ALL_PAGES]);
  const [invDetailPerms, setInvDetailPerms] = useState<
    Record<string, { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }>
  >({});
  const [invPassword, setInvPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);

  const generatePassword = () => {
    const pwd = crypto.randomUUID().slice(0, 12) + "Aa1!";
    setInvPassword(pwd);
    return pwd;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: adminUsers }, { data: storeData }] = await Promise.all([
      cloud.from("admin_users").select("*").order("created_at", { ascending: true }),
      cloud.from("stores").select("id, name, slug").eq("active", true).order("name"),
    ]);
    setUsers((adminUsers as AdminUser[]) ?? []);
    setStores((storeData as Store[]) ?? []);

    if (adminUsers && user) {
      const hasCurrentUser = adminUsers.some((u: any) => u.user_id === user.id);
      if (!hasCurrentUser) {
        const { data: allowlisted } = await cloud
          .from("admin_allowlist")
          .select("email")
          .eq("email", user.email ?? "")
          .maybeSingle();

        if (allowlisted) {
          setUsers((prev) => [
            {
              id: "legacy",
              user_id: user.id,
              name: user.email?.split("@")[0] ?? "Admin",
              email: user.email ?? "",
              role: "master",
              status: "active",
              created_by: null,
              created_at: new Date().toISOString(),
            },
            ...prev,
          ]);
        }
      }
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetInviteForm = () => {
    setInvName("");
    setInvEmail("");
    setInvRole("operator");
    setInvStores([]);
    setInvPages([...ALL_PAGES]);
    setInvDetailPerms({});
  };

  const handleInvite = async () => {
    if (!invName.trim() || !invEmail.trim()) {
      toast.error("Nome e email são obrigatórios");
      return;
    }

    setSaving(true);
    try {
      const { data: existing } = await cloud
        .from("admin_users")
        .select("id")
        .eq("email", invEmail.trim().toLowerCase())
        .maybeSingle();

      if (existing) {
        toast.error("Este email já está cadastrado");
        setSaving(false);
        return;
      }

      const { data: signUpData, error: signUpError } = await cloud.auth.signUp({
        email: invEmail.trim().toLowerCase(),
        password: crypto.randomUUID().slice(0, 16) + "Aa1!",
        options: { data: { invited_name: invName.trim() } },
      });

      if (signUpError) {
        toast.error("Erro ao criar usuário: " + signUpError.message);
        setSaving(false);
        return;
      }

      const newUserId = signUpData.user?.id;
      if (!newUserId) {
        toast.error("Erro ao obter ID do usuário criado");
        setSaving(false);
        return;
      }

      const { error: insertError } = await cloud.from("admin_users").insert({
        user_id: newUserId,
        name: invName.trim(),
        email: invEmail.trim().toLowerCase(),
        role: invRole,
        created_by: user?.id,
      });

      if (insertError) {
        toast.error("Erro ao salvar usuário: " + insertError.message);
        setSaving(false);
        return;
      }

      await cloud.from("user_roles").insert({
        user_id: newUserId,
        role: "admin" as any,
      });

      if (invRole !== "master" && invStores.length > 0) {
        await cloud.from("user_store_access").insert(
          invStores.map((storeId) => ({ user_id: newUserId, store_id: storeId }))
        );
      }

      if (invRole === "operator" || invRole === "visualizador") {
        const permRows = invPages.map((page) => ({
          user_id: newUserId,
          page,
          can_view: true,
          can_create: invRole === "visualizador" ? false : (invDetailPerms[page]?.can_create ?? false),
          can_edit: invRole === "visualizador" ? false : (invDetailPerms[page]?.can_edit ?? false),
          can_delete: invRole === "visualizador" ? false : (invDetailPerms[page]?.can_delete ?? false),
        }));
        if (permRows.length > 0) {
          await cloud.from("user_page_permissions").insert(permRows);
        }
      }

      await cloud.from("activity_logs").insert({
        user_id: user?.id,
        user_name: user?.email,
        action: "invited_user",
        entity: "admin_users",
        entity_id: newUserId,
        metadata: { invited_email: invEmail, role: invRole },
      });

      toast.success(`Usuário ${invName} convidado com sucesso`);
      resetInviteForm();
      setInviteOpen(false);
      fetchData();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (adminUser: AdminUser) => {
    const newStatus = adminUser.status === "active" ? "disabled" : "active";
    const { error } = await cloud
      .from("admin_users")
      .update({ status: newStatus })
      .eq("id", adminUser.id);

    if (error) {
      toast.error("Erro ao alterar status");
      return;
    }

    await cloud.from("activity_logs").insert({
      user_id: user?.id,
      user_name: user?.email,
      action: newStatus === "active" ? "reactivated_user" : "deactivated_user",
      entity: "admin_users",
      entity_id: adminUser.user_id,
    });

    toast.success(newStatus === "active" ? "Usuário reativado" : "Usuário desativado");
    fetchData();
  };

  const handleResetPassword = async (adminUser: AdminUser) => {
    if (!confirm(`Resetar senha de ${adminUser.email}? Uma senha temporária será gerada.`)) return;

    setResettingId(adminUser.id);
    try {
      const { data, error } = await cloud.functions.invoke("admin-reset-password", {
        body: { target_user_id: adminUser.user_id },
      });

      if (error) {
        toast.error("Erro ao resetar senha: " + error.message);
        return;
      }

      if (data?.temporary_password) {
        toast.success(
          `Senha temporária: ${data.temporary_password}\nInforme ao usuário para trocar ao fazer login.`,
          { duration: 15000 }
        );
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setResettingId(null);
    }
  };

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !searchTerm ||
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (!isMaster) {
    return (
      <div className="p-6 text-destructive">
        Apenas Admin Master pode gerenciar usuários e acessos.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuários e Acessos</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os acessos ao painel administrativo
          </p>
        </div>

        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetInviteForm}>
              <UserPlus className="mr-2 h-4 w-4" />
              Convidar Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Convidar Novo Usuário</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={invName} onChange={(e) => setInvName(e.target.value)} placeholder="Nome do usuário" />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={invEmail} onChange={(e) => setInvEmail(e.target.value)} placeholder="email@exemplo.com" type="email" />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Acesso</Label>
                <Select value={invRole} onValueChange={setInvRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="master">Master</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="gerente">Gerente</SelectItem>
                    <SelectItem value="operator">Operador</SelectItem>
                    <SelectItem value="visualizador">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {invRole === "master" && "Acesso total ao sistema, pode gerenciar usuários e permissões."}
                  {invRole === "admin" && "Acesso a lojas permitidas, gerencia produtos, pedidos e clientes."}
                  {invRole === "gerente" && "Gerencia lojas e equipes atribuídas, sem acesso a configurações."}
                  {invRole === "operator" && "Acesso operacional limitado às páginas e ações autorizadas."}
                  {invRole === "visualizador" && "Apenas visualização, sem poder criar, editar ou excluir."}
                </p>
              </div>

              {invRole !== "master" && (
                <>
                  <div className="space-y-2">
                    <Label>Lojas com acesso</Label>
                    <div className="space-y-2 rounded-lg border border-border/50 p-3">
                      {stores.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Nenhuma loja cadastrada</p>
                      ) : (
                        stores.map((store) => (
                          <label key={store.id} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={invStores.includes(store.id)}
                              onCheckedChange={(checked) => {
                                setInvStores((prev) =>
                                  checked ? [...prev, store.id] : prev.filter((id) => id !== store.id)
                                );
                              }}
                            />
                            {store.name}
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Páginas do sistema</Label>
                    <div className="space-y-2 rounded-lg border border-border/50 p-3 max-h-48 overflow-y-auto">
                      {ALL_PAGES.map((page) => (
                        <label key={page} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={invPages.includes(page)}
                            onCheckedChange={(checked) => {
                              setInvPages((prev) =>
                                checked ? [...prev, page] : prev.filter((p) => p !== page)
                              );
                            }}
                          />
                          {PAGE_LABELS[page]}
                        </label>
                      ))}
                    </div>
                  </div>

                  {(invRole === "operator" || invRole === "gerente") && (
                    <div className="space-y-2">
                      <Label>Permissões detalhadas</Label>
                      <div className="space-y-3 rounded-lg border border-border/50 p-3">
                        {DETAIL_PAGES.filter((p) => invPages.includes(p)).map((page) => {
                          const perms = invDetailPerms[page] ?? {
                            can_view: true,
                            can_create: false,
                            can_edit: false,
                            can_delete: false,
                          };
                          return (
                            <div key={page} className="space-y-1">
                              <p className="text-sm font-medium">{PAGE_LABELS[page]}</p>
                              <div className="flex flex-wrap gap-3">
                                {(["can_view", "can_create", "can_edit", "can_delete"] as const).map((action) => (
                                  <label key={action} className="flex items-center gap-1 text-xs cursor-pointer">
                                    <Checkbox
                                      checked={perms[action]}
                                      onCheckedChange={(checked) => {
                                        setInvDetailPerms((prev) => ({
                                          ...prev,
                                          [page]: { ...perms, [action]: !!checked },
                                        }));
                                      }}
                                    />
                                    {action.replace("can_", "")}
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              <Button onClick={handleInvite} disabled={saving} className="w-full">
                {saving ? "Salvando..." : "Enviar Convite"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        {stores.length > 0 && (
          <Select value={filterStore} onValueChange={setFilterStore}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por loja" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as lojas</SelectItem>
              {stores.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Lojas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {roleIcon(u.role)}
                        {u.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>{roleBadge(u.role)}</TableCell>
                    <TableCell>
                      {u.role === "master" ? (
                        <span className="text-xs text-muted-foreground">Todas</span>
                      ) : (
                        <StoreAccessBadges userId={u.user_id} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.status === "active" ? "default" : "secondary"}>
                        {u.status === "active" ? "Ativo" : "Desativado"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {u.id !== "legacy" && (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Resetar senha"
                            disabled={resettingId === u.id}
                            onClick={() => handleResetPassword(u)}
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={u.status === "active" ? "Desativar" : "Reativar"}
                            onClick={() => toggleStatus(u)}
                          >
                            {u.status === "active" ? (
                              <Ban className="h-4 w-4" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StoreAccessBadges({ userId }: { userId: string }) {
  const [stores, setStores] = useState<string[]>([]);

  useEffect(() => {
    cloud
      .from("user_store_access")
      .select("stores:store_id(name)")
      .eq("user_id", userId)
      .then(({ data }) => {
        setStores((data ?? []).map((d: any) => d.stores?.name ?? "").filter(Boolean));
      });
  }, [userId]);

  if (stores.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {stores.map((s) => (
        <Badge key={s} variant="outline" className="text-xs">
          {s}
        </Badge>
      ))}
    </div>
  );
}
