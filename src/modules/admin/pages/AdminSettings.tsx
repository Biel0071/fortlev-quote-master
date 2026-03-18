import { Navigate } from "react-router-dom";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";

export default function AdminSettings() {
  const { isMaster } = useAdminPermissions();
  
  if (isMaster) {
    return <Navigate to="/admin/configuracoes/usuarios" replace />;
  }
  return <Navigate to="/admin/configuracoes/identidade" replace />;
}
