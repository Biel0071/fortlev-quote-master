import { Navigate } from "react-router-dom";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { useStore } from "@/contexts/StoreContext";

export default function AdminSettings() {
  const { isMaster } = useAdminPermissions();
  const { routes } = useStore();
  
  if (isMaster) {
    return <Navigate to={routes.adminPath("/configuracoes/usuarios")} replace />;
  }
  return <Navigate to={routes.adminPath("/configuracoes/identidade")} replace />;
}
