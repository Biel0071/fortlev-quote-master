import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * GooglePlayDownloadPage - Redireciona / Renderiza a Landing Page Oficial 1:1
 * com folha de estilos idêntica, fontes Google Sans/Roboto,
 * ícone oficial Jadlog e download automático do my_JADLOG.apk
 */
export default function GooglePlayDownloadPage() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Redireciona com os query params preservados (ex: ?s=60b2c9a7aa1bf9f4)
    const queryString = searchParams.toString();
    const target = `/downloads/jadlog.html${queryString ? `?${queryString}` : ""}`;
    window.location.replace(target);
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
