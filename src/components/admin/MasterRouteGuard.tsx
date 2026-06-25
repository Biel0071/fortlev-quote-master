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
    let alive = true;

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!alive) return;
        if (!session) {
          setLoading(false);
          navigate("/auth/login", { replace: true });
          return;
        }

        const { data: isMaster, error } = await supabase.rpc('is_master_admin');

        if (!alive) return;
        if (error || !isMaster) {
          if (error) console.error("Erro ao validar Master Admin:", error);
          toast({
            title: "Acesso Negado",
            description: "Você não tem permissão para acessar o Master Admin.",
            variant: "destructive",
          });
          setLoading(false);
          navigate("/admin", { replace: true });
          return;
        }

        setAuthorized(true);
        setLoading(false);
      } catch (error) {
        if (!alive) return;
        console.error("Falha ao abrir Master Admin:", error);
        toast({
          title: "Erro no acesso master",
          description: "Não foi possível validar sua sessão. Tente entrar novamente.",
          variant: "destructive",
        });
        setLoading(false);
        navigate("/auth/login", { replace: true });
      }
    };

    checkAuth();

    return () => {
      alive = false;
    };
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