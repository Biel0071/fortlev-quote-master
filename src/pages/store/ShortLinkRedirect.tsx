import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { cloud } from "@/lib/cloud";

export default function ShortLinkRedirect() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Resolvendo link...");

  useEffect(() => {
    const resolve = async () => {
      if (!slug) {
        setMessage("Link inválido");
        return;
      }

      const url = new URL(window.location.href);
      const sessionToken = localStorage.getItem("tracking_session_token_v1") || sessionStorage.getItem("tracking_session_token_temp_v1") || "";

      const { data, error } = await cloud.functions.invoke("short-link-resolve", {
        body: {
          slug,
          session_token: sessionToken,
          utm_source: url.searchParams.get("utm_source") ?? undefined,
          utm_campaign: url.searchParams.get("utm_campaign") ?? undefined,
          referrer: document.referrer || undefined,
          path: window.location.pathname + window.location.search + window.location.hash,
        },
      });

      if (error) {
        setMessage("Não foi possível resolver este link");
        setTimeout(() => navigate("/", { replace: true }), 1400);
        return;
      }

      const destination = (data as { destination_url?: string; session_token?: string } | null)?.destination_url;
      const resolvedSessionToken = (data as { destination_url?: string; session_token?: string } | null)?.session_token;

      if (resolvedSessionToken) {
        localStorage.setItem("tracking_session_token_v1", resolvedSessionToken);
      }

      if (!destination) {
        setMessage("Destino não encontrado");
        setTimeout(() => navigate("/", { replace: true }), 1400);
        return;
      }

      window.location.href = destination;
    };

    void resolve();
  }, [slug, navigate]);

  return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">{message}</div>;
}