import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { cloud } from "@/lib/cloud";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ValidationResult = {
  token_id: string;
  store_id: string;
  access_scope: "fortlev" | "construction" | "both";
  token_name: string;
  expires_at: string;
};

export default function PublicQuotationAccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState<ValidationResult | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setLoading(false);
        setValid(null);
        return;
      }
      const { data, error } = await cloud.rpc("validate_public_quotation_token", {
        _raw_token: token,
        _ip: null,
        _user_agent: navigator.userAgent,
      });

      if (error || !data || data.length === 0) {
        setValid(null);
      } else {
        setValid(data[0] as ValidationResult);
      }
      setLoading(false);
    };
    run();
  }, [token]);

  const scope = useMemo(() => valid?.access_scope ?? "both", [valid]);

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Validando acesso...</div>;
  }

  if (!valid) {
    return (
      <div className="min-h-screen grid place-items-center p-4">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Acesso expirado ou inválido</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            O link informado não é válido ou já expirou.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-background">
      <div className="max-w-3xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Materiais de Construção</CardTitle>
            <p className="text-sm text-muted-foreground">Orçamentos</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Acesso liberado para o token <strong>{valid.token_name}</strong> até {new Date(valid.expires_at).toLocaleString("pt-BR")}
            </p>
            <div className="flex flex-wrap gap-2">
              {(scope === "both" || scope === "fortlev") && (
                <Button onClick={() => navigate(`/orcamentos?token=${encodeURIComponent(token)}`)}>Abrir Fortlev</Button>
              )}
              {(scope === "both" || scope === "construction") && (
                <Button variant="outline" onClick={() => navigate(`/construcao?token=${encodeURIComponent(token)}`)}>
                  Abrir Construção
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}