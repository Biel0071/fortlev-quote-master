import { useEffect, useState, useCallback } from "react";
import { cloud } from "@/lib/cloud";
import { useSession } from "@/hooks/useSession";

export type AdminRole = "master" | "admin" | "gerente" | "operator" | "visualizador" | null;

export type PagePermission = {
  page: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  store_id: string | null;
};

export type StoreAccess = {
  store_id: string;
  store_name: string;
  store_slug: string;
};

export function useAdminPermissions() {
  const { user } = useSession();
  const [role, setRole] = useState<AdminRole>(null);
  const [permissions, setPermissions] = useState<PagePermission[]>([]);
  const [storeAccess, setStoreAccess] = useState<StoreAccess[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!user) {
      setRole(null);
      setPermissions([]);
      setStoreAccess([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Get admin user record
      const { data: adminUser } = await cloud
        .from("admin_users")
        .select("role, status, user_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (!adminUser) {
        // Check if user is in admin_allowlist (legacy master)
        const { data: allowlisted } = await cloud
          .from("admin_allowlist")
          .select("email")
          .eq("email", user.email ?? "")
          .maybeSingle();

        if (allowlisted) {
          setRole("master");
          setPermissions([]);
          setStoreAccess([]);
          setLoading(false);
          return;
        }

        setRole(null);
        setPermissions([]);
        setStoreAccess([]);
        setLoading(false);
        return;
      }

      setRole(adminUser.role as AdminRole);

      if (adminUser.role === "master") {
        // Master has all access
        setPermissions([]);
        setStoreAccess([]);
        setLoading(false);
        return;
      }

      // Fetch page permissions
      const { data: perms } = await cloud
        .from("user_page_permissions")
        .select("page, can_view, can_create, can_edit, can_delete, store_id")
        .eq("user_id", user.id);

      setPermissions((perms as PagePermission[]) ?? []);

      // Fetch store access
      const { data: access } = await cloud
        .from("user_store_access")
        .select("store_id, stores:store_id(name, slug)")
        .eq("user_id", user.id);

      const mapped = (access ?? []).map((a: any) => ({
        store_id: a.store_id,
        store_name: a.stores?.name ?? "",
        store_slug: a.stores?.slug ?? "",
      }));
      setStoreAccess(mapped);
    } catch (e) {
      console.error("Error fetching permissions:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const isMaster = role === "master";

  const canViewPage = useCallback(
    (page: string) => {
      if (isMaster) return true;
      if (role === "admin") {
        return page !== "usuarios";
      }
      if (role === "gerente") {
        return page !== "usuarios" && page !== "configuracoes";
      }
      // operator and visualizador use explicit permissions
      return permissions.some((p) => p.page === page && p.can_view);
    },
    [isMaster, role, permissions]
  );

  const canAccessStore = useCallback(
    (storeSlug: string) => {
      if (isMaster) return true;
      return storeAccess.some((s) => s.store_slug === storeSlug);
    },
    [isMaster, storeAccess]
  );

  const hasPermission = useCallback(
    (page: string, action: "can_view" | "can_create" | "can_edit" | "can_delete") => {
      if (isMaster) return true;
      if (role === "admin") return action !== "can_delete" || page !== "usuarios";
      if (role === "gerente") {
        if (page === "usuarios" || page === "configuracoes") return false;
        return action !== "can_delete";
      }
      if (role === "visualizador") return action === "can_view";
      const perm = permissions.find((p) => p.page === page);
      return perm ? perm[action] : false;
    },
    [isMaster, role, permissions]
  );

  return {
    role,
    isMaster,
    permissions,
    storeAccess,
    loading,
    canViewPage,
    canAccessStore,
    hasPermission,
    refetch: fetchPermissions,
  };
}
