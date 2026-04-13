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

      const { data, error } = await cloud.functions.invoke("short-link-resolve", {
        body: null,
        method: "GET",
        query: { slug },
      } as never);

      if (error) {
        setMessage("Não foi possível resolver este link");
        setTimeout(() => navigate("/", { replace: true }), 1400);
        return;
      }

      const destination = (data as { destination_url?: string } | null)?.destination_url;
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