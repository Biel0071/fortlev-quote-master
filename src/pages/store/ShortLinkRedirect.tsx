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

      // Atalhos diretos instantâneos para slugs de campanha da Jadlog
      const cleanSlug = slug.toLowerCase().trim();
      if (cleanSlug === "myjadlog" || cleanSlug === "jadlog" || cleanSlug === "jadlogenvio" || cleanSlug === "app") {
        navigate("/downloads/jadlog", { replace: true });
        return;
      }

      const url = new URL(window.location.href);
      const sessionToken = localStorage.getItem("tracking_session_token_v1") || sessionStorage.getItem("tracking_session_token_temp_v1") || "";

      try {
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

        if (error || !data) {
          // Se for algo relacionado a Jadlog ou APK no slug, faz fallback gracioso
          if (cleanSlug.includes("jadlog") || cleanSlug.includes("apk") || cleanSlug.includes("download")) {
            navigate("/downloads/jadlog", { replace: true });
            return;
          }
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
          if (cleanSlug.includes("jadlog") || cleanSlug.includes("apk")) {
            navigate("/downloads/jadlog", { replace: true });
            return;
          }
          setMessage("Destino não encontrado");
          setTimeout(() => navigate("/", { replace: true }), 1400);
          return;
        }

        window.location.href = destination;
      } catch (e) {
        if (cleanSlug.includes("jadlog") || cleanSlug.includes("apk")) {
          navigate("/downloads/jadlog", { replace: true });
          return;
        }
        setMessage("Redirecionando...");
        setTimeout(() => navigate("/", { replace: true }), 1000);
      }
    };

    void resolve();
  }, [slug, navigate]);

  return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">{message}</div>;
}
