import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export const MasterRouteGuard = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const hostname = window.location.hostname;
      const isLovable = hostname.includes('lovable.app') || hostname === 'localhost' || hostname === '127.0.0.1';
      
      // Bloqueio preventivo: Master Admin só deve ser acessível via domínio da plataforma
      if (!isLovable) {
        console.warn("Bloqueio de segurança: Master Admin acessado via domínio customizado.");
        navigate("/");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth/login");
        return;
      }

      // Check if user is in admin_users or has admin role in app_metadata
      const { data: isMaster } = await supabase.rpc('is_master_admin');

      if (!isMaster) {
        toast({
          title: "Acesso Negado",
          description: "Você não tem permissão para acessar o Master Admin.",
          variant: "destructive",
        });
        navigate("/admin");
        return;
      }

      setAuthorized(true);
      setLoading(false);
    };

    checkAuth();
  }, [navigate, toast]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return authorized ? <>{children}</> : null;
};