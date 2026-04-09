import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { cloud } from "@/lib/cloud";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ValidationResult = {
  token_id: string;
  store_id: string;
  store_slug: string;
  access_scope: "fortlev" | "construction" | "both";
  token_name: string;
  expires_at: string;
  uses_count: number;
  max_uses: number | null;
  is_first_access: boolean;
  device_bound: boolean;
};

const TOKEN_COOKIE = "token_access";

async function getDeviceHash() {
  const data = [
    navigator.userAgent,
    String(screen.width),
    String(screen.height),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join("|");

  return btoa(data);
}

export default function PublicQuotationAccess() {
  const { slug: slugParam, token: tokenParam } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryToken = searchParams.get("token") ?? "";
  const querySlug = searchParams.get("slug") ?? "";
  const token = tokenParam ?? queryToken;
  const slug = slugParam ?? querySlug;
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState<ValidationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("Acesso inválido ou expirado");

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setLoading(false);
        setValid(null);
        return;
      }

      let deviceHash = localStorage.getItem("device_hash") ?? "";
      if (!deviceHash) {
        deviceHash = await getDeviceHash();
        localStorage.setItem("device_hash", deviceHash);
      }

      const { data, error } = await cloud.rpc("validate_public_quotation_token", {
        _raw_token: token,
        _store_slug: slug || null,
        _device_hash: deviceHash,
        _ip: null,
        _access_scope: null,
        _user_agent: navigator.userAgent,
      });

      if (error || !data || data.length === 0) {
        setValid(null);
        setErrorMessage(error?.message || "Acesso inválido ou expirado");
      } else {
        const current = data[0] as ValidationResult;
        setValid(current);
        document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=31536000; SameSite=Lax`;
        localStorage.setItem(
          "public_quotation_token_ctx",
          JSON.stringify({
            token,
            tokenId: current.token_id,
            storeId: current.store_id,
            storeSlug: current.store_slug,
            deviceHash,
            validatedAt: new Date().toISOString(),
          }),
        );
      }
      setLoading(false);
    };
    run();
  }, [token, slug]);

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
            {errorMessage || "O link informado não é válido ou já expirou."}
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