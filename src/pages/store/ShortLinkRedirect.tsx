import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { decodeEncryptedToken } from "@/utils/encryptedLinks";
import { resolveEncryptedLinkRpc } from "@/modules/tracking/trackingClient";

const SESSION_KEY = "tracking_session_token_v1";
const TEMP_SESSION_KEY = "tracking_session_token_temp_v1";

function getOrCreateSessionToken() {
  try {
    const existing = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(TEMP_SESSION_KEY);
    if (existing) return existing;
    const created =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

export default function ShortLinkRedirect() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Redirecionando...");

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      if (!slug) {
        setMessage("Link inválido");
        navigate("/", { replace: true });
        return;
      }

      const url = new URL(window.location.href);
      const utmSource = url.searchParams.get("utm_source") ?? undefined;
      const utmCampaign = url.searchParams.get("utm_campaign") ?? undefined;
      const sessionToken = getOrCreateSessionToken();
      const decoded = decodeEncryptedToken(slug);

      if (decoded) {
        // Dispara registro criptografado + anti-bot + IP hash no PostgreSQL em paralelo sem bloquear o clique
        void resolveEncryptedLinkRpc({
          slug,
          sessionToken,
          targetUrl: decoded.targetUrl,
          label: decoded.label,
          channel: decoded.channel,
          utmSource,
          utmCampaign,
          referrer: document.referrer || decoded.source,
        });

        if (decoded.targetUrl.startsWith("/")) {
          navigate(decoded.targetUrl, { replace: true });
        } else {
          window.location.replace(decoded.targetUrl);
        }
        return;
      }

      const cleanSlug = slug.toLowerCase().trim();
      const rpcRes = await resolveEncryptedLinkRpc({
        slug: cleanSlug,
        sessionToken,
        utmSource,
        utmCampaign,
        referrer: document.referrer || undefined,
      });

      if (cancelled) return;

      if (rpcRes.session_token) {
        try {
          localStorage.setItem(SESSION_KEY, rpcRes.session_token);
        } catch { /* ignore storage errors */ }
      }

      const destination = rpcRes.ok && rpcRes.destination_url ? rpcRes.destination_url : "";
      if (destination) {
        if (destination.startsWith("/")) {
          navigate(destination, { replace: true });
        } else {
          window.location.replace(destination);
        }
        return;
      }

      // Atalhos de campanha diretos sem registro prévio no banco
      if (
        cleanSlug === "google-play" ||
        cleanSlug === "app" ||
        cleanSlug === "material-online" ||
        cleanSlug.includes("apk") ||
        cleanSlug.includes("download") ||
        cleanSlug.includes("jadlog")
      ) {
        navigate("/google-play", { replace: true });
        return;
      }

      setMessage("Redirecionando para a loja...");
      navigate("/", { replace: true });
    };

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [slug, navigate]);

  return (
    <div className="min-h-screen grid place-items-center bg-background text-sm text-muted-foreground">
      {message}
    </div>
  );
}
