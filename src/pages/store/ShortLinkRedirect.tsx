import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

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

      const endpoint = `${window.location.origin}/functions/v1/short-link-resolve?slug=${encodeURIComponent(slug)}`;
      const res = await fetch(endpoint, { method: "GET" });
      const data = (await res.json().catch(() => null)) as { destination_url?: string } | null;

      if (!res.ok) {
        setMessage("Não foi possível resolver este link");
        setTimeout(() => navigate("/", { replace: true }), 1400);
        return;
      }

      const destination = data?.destination_url;
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