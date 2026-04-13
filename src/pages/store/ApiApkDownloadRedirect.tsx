import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const SESSION_KEY = "tracking_session_token_v1";
const TEMP_SESSION_KEY = "tracking_session_token_temp_v1";

function getSessionToken() {
  return (
    localStorage.getItem(SESSION_KEY) ||
    sessionStorage.getItem(TEMP_SESSION_KEY) ||
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(16).slice(2)}`)
  );
}

export default function ApiApkDownloadRedirect() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Preparando download...");

  const sessionToken = useMemo(() => getSessionToken(), []);

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setMessage("Token inválido");
        setTimeout(() => navigate("/", { replace: true }), 1200);
        return;
      }

      try {
        localStorage.setItem(SESSION_KEY, sessionToken);
      } catch {
        // noop
      }

      try {
        const endpoint = `${window.location.origin}/functions/v1/download-apk-public?token=${encodeURIComponent(token)}&session_id=${encodeURIComponent(sessionToken)}`;
        const res = await fetch(endpoint);

        if (!res.ok) {
          setMessage("Não foi possível baixar o APK");
          setTimeout(() => navigate("/", { replace: true }), 1400);
          return;
        }

        const blob = await res.blob();
        const contentDisposition = res.headers.get("content-disposition") || "";
        const match = contentDisposition.match(/filename="?([^";]+)"?/i);
        const fileName = match?.[1] || "app.apk";

        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.URL.revokeObjectURL(url);

        setMessage("Download iniciado");
        setTimeout(() => navigate("/", { replace: true }), 1000);
      } catch {
        setMessage("Erro ao iniciar download");
        setTimeout(() => navigate("/", { replace: true }), 1400);
      }
    };

    void run();
  }, [navigate, sessionToken, token]);

  return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">{message}</div>;
}
