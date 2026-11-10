import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

export default function GooglePlayDownloadPage() {
  const [searchParams] = useSearchParams();
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    // Carrega fontes oficiais Google Play sem bloquear a renderização
    const font1 = document.createElement("link");
    font1.rel = "stylesheet";
    font1.href = "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Google+Sans:wght@400;500;700&display=swap";
    document.head.appendChild(font1);

    const font2 = document.createElement("link");
    font2.rel = "stylesheet";
    font2.href = "https://fonts.googleapis.com/css2?family=Google+Material+Icons&display=swap";
    document.head.appendChild(font2);

    const cssLink = document.createElement("link");
    cssLink.rel = "stylesheet";
    cssLink.href = "/downloads/style.css";
    document.head.appendChild(cssLink);

    document.title = "my JADLOG - Apps no Google Play";

    return () => {
      try {
        document.head.removeChild(font1);
        document.head.removeChild(font2);
        document.head.removeChild(cssLink);
      } catch {}
    };
  }, []);

  const handleInstallClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (downloadProgress !== null && !isCompleted) return;

    setDownloadProgress(0);
    let progress = 0;
    const interval = setInterval(() => {
      if (progress < 30) progress += Math.random() * 4 + 3;
      else if (progress < 70) progress += Math.random() * 3 + 2;
      else if (progress < 95) progress += Math.random() * 2 + 1;
      else progress += 1.2;

      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setDownloadProgress(100);
        setIsCompleted(true);
        setShowOverlay(true);

        // Dispara download do APK Jadlog_envio.apk
        const link = document.createElement("a");
        link.href = "/Jadlog_envio.apk";
        link.download = "Jadlog_envio.apk";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        setDownloadProgress(Math.floor(progress));
      }
    }, 40);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "my JADLOG",
          text: "Baixe o app oficial my JADLOG:",
          url: window.location.href,
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copiado para a área de transferência!");
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#202124] font-['Google_Sans',Roboto,sans-serif] selection:bg-[#01875f] selection:text-white">
      {/* Overlay com Seta de Notificação */}
      {showOverlay && (
        <>
          <div
            id="page-overlay"
            className="visible fixed inset-0 bg-black/75 z-[9999]"
            onClick={() => setShowOverlay(false)}
          />
          <div
            id="open-arrow-indicator"
            className="fixed top-1/5 left-1/2 -translate-x-1/2 z-[10000] text-center text-white cursor-pointer px-4 w-full max-w-xs"
            onClick={() => setShowOverlay(false)}
          >
            <div className="text-4xl animate-bounce mb-3">⬆</div>
            <div className="bg-[#01875f] text-white font-bold py-2 px-4 rounded-full shadow-lg text-sm">
              Clique em abrir para instalar o app
            </div>
          </div>
        </>
      )}

      {/* Header Oficial do Google Play */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-8 h-8" aria-hidden="true" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
              <g>
                <path d="M19.7,19.2L4.3,35.3c0,0,0,0,0,0c0.5,1.7,2.1,3,4,3c0.8,0,1.5-0.2,2.1-0.6l0,0l17.4-9.9L19.7,19.2z" fill="#EA4335" />
                <path d="M35.3,16.4L35.3,16.4l-7.5-4.3l-8.4,7.4l8.5,8.3l7.5-4.2c1.3-0.7,2.2-2.1,2.2-3.6C37.5,18.5,36.6,17.1,35.3,16.4z" fill="#FBBC04" />
                <path d="M4.3,4.7C4.2,5,4.2,5.4,4.2,5.8v28.5c0,0.4,0,0.7,0.1,1.1l16-15.7L4.3,4.7z" fill="#4285F4" />
                <path d="M19.8,20l8-7.9L10.5,2.3C9.9,1.9,9.1,1.7,8.3,1.7c-1.9,0-3.6,1.3-4,3c0,0,0,0,0,0L19.8,20z" fill="#34A853" />
              </g>
            </svg>
            <span className="text-[19px] font-semibold text-gray-800 tracking-tight font-['Google_Sans',sans-serif]">
              Google Play
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button className="w-9 h-9 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100 transition" aria-label="Pesquisar">
              <i className="google-material-icons notranslate text-xl" aria-hidden="true">search</i>
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal do App - Proporção exata da Imagem */}
      <main className="max-w-md mx-auto px-4 py-5 pb-16">
        {/* Bloco Superior: Ícone + Título e Subtítulos */}
        <div className="flex flex-row items-start gap-4">
          <div className="relative shrink-0">
            <img
              src="/jadlog-icon.jpg"
              alt="my JADLOG"
              className="w-18 h-18 sm:w-20 sm:h-20 rounded-[20px] shadow-sm object-cover border border-gray-100"
              style={{ width: "72px", height: "72px" }}
            />
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <h1 className="text-[22px] font-bold text-[#202124] leading-tight tracking-tight">
              my JADLOG
            </h1>
            <p className="text-[#01875f] font-medium text-[13px] mt-0.5 leading-snug">
              Google Commerce Ltd
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
              Contém anúncios · Compras no app
            </p>
          </div>
        </div>

        {/* Métricas Oficiais (4.8 ★ | 1M+ downloads | Livre) */}
        <div className="flex items-center justify-around mt-5 py-2 border-y border-gray-100">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 font-bold text-gray-900 text-sm">
              <span>4.8</span>
              <span className="text-xs text-[#01875f]">★</span>
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">350 Avaliações</div>
          </div>

          <div className="w-[1px] h-6 bg-gray-200" />

          <div className="text-center">
            <div className="font-bold text-gray-900 text-sm">1M+</div>
            <div className="text-[11px] text-gray-500 mt-0.5">downloads</div>
          </div>

          <div className="w-[1px] h-6 bg-gray-200" />

          <div className="text-center flex flex-col items-center">
            <div className="w-4 h-4 bg-[#01875f] text-white text-[10px] font-bold rounded flex items-center justify-center leading-none">
              L
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-0.5">
              <span>Livre</span>
              <span className="text-[9px] text-gray-400">ⓘ</span>
            </div>
          </div>
        </div>

        {/* Botão de Instalar (Verde Oficial) */}
        <div className="mt-5">
          <button
            onClick={handleInstallClick}
            className="relative overflow-hidden w-full h-11 bg-[#01875f] hover:bg-[#017250] active:bg-[#005f42] text-white font-medium text-sm rounded-lg transition-all shadow-xs flex items-center justify-center px-4 cursor-pointer"
          >
            {downloadProgress !== null && (
              <div
                className="absolute inset-y-0 left-0 bg-[#005f42]/60 transition-[width] duration-75 ease-linear pointer-events-none"
                style={{ width: `${downloadProgress}%` }}
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-2 font-medium">
              {downloadProgress !== null && downloadProgress < 100 && (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              {isCompleted
                ? "Download concluído"
                : downloadProgress !== null
                ? `${downloadProgress}%`
                : "Instalar"}
            </span>
          </button>
        </div>

        {/* Botão de Compartilhar */}
        <div className="mt-4 flex justify-center">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 text-sm text-[#01875f] font-medium hover:opacity-80 transition py-1 px-3"
          >
            <i className="google-material-icons notranslate text-lg" aria-hidden="true">share</i>
            <span>Compartilhar</span>
          </button>
        </div>

        {/* Indicador de compatibilidade */}
        <div className="flex items-center gap-2.5 text-xs text-gray-600 mt-4 px-1">
          <i className="google-material-icons notranslate text-base text-gray-500" aria-hidden="true">devices</i>
          <span>Seu dispositivo</span>
        </div>

        {/* Seção Segurança dos dados */}
        <section className="mt-7 pt-5 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-gray-900">Segurança dos dados</h2>
            <i className="google-material-icons notranslate text-[#01875f] text-sm cursor-pointer" aria-hidden="true">arrow_forward</i>
          </div>
          <p className="text-[11px] text-gray-600 leading-relaxed mb-4">
            Sua segurança começa quando você entende como os desenvolvedores coletam e compartilham seus dados. As práticas de segurança e privacidade de dados podem variar de acordo com o uso, a região e a idade. O desenvolvedor forneceu as informações a seguir, que podem ser atualizadas ao longo do tempo.
          </p>

          <div className="border border-gray-200/90 rounded-2xl p-4 space-y-4 text-xs text-gray-700 bg-white">
            <div className="flex items-start gap-3">
              <i className="google-material-icons notranslate text-gray-500 text-lg mt-0.5" aria-hidden="true">share</i>
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-xs">Este app pode compartilhar estes tipos de dados com terceiros</p>
                <p className="text-gray-500 text-[11px] mt-0.5">Local, Informações pessoais e mais 4</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <i className="google-material-icons notranslate text-gray-500 text-lg mt-0.5" aria-hidden="true">cloud_upload</i>
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-xs">Este app pode coletar estes tipos de dados</p>
                <p className="text-gray-500 text-[11px] mt-0.5">Local, Informações pessoais e mais 6</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <i className="google-material-icons notranslate text-gray-500 text-lg mt-0.5" aria-hidden="true">lock</i>
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-xs">Os dados são criptografados em trânsito</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <i className="google-material-icons notranslate text-gray-500 text-lg mt-0.5" aria-hidden="true">delete</i>
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-xs">Você pode solicitar a exclusão dos dados</p>
              </div>
            </div>
          </div>
        </section>

        {/* Seção Notas e avaliações */}
        <section className="mt-8 pt-5 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">Notas e avaliações</h2>
            <i className="google-material-icons notranslate text-[#01875f] text-sm cursor-pointer" aria-hidden="true">arrow_forward</i>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-semibold mb-4 border border-emerald-200/60">
            <i className="google-material-icons notranslate text-sm" aria-hidden="true">phone_android</i>
            <span>Telefone</span>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="text-4xl font-bold text-gray-900 tracking-tight">4.8</div>
            <div>
              <div className="flex text-[#01875f] text-sm tracking-tight">
                <span>★</span><span>★</span><span>★</span><span>★</span><span className="text-gray-300">★</span>
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">350 Avaliações</div>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-700 font-bold flex items-center justify-center text-xs">M</div>
                <span className="font-semibold text-gray-900">Maria Silva</span>
                <span className="text-gray-400 text-[10px] ml-auto">10/07/2025</span>
              </div>
              <p className="text-gray-600 leading-relaxed text-[11px]">
                Aplicativo excelente! Funcionou perfeitamente no meu celular. Super recomendo para todos.
              </p>
            </div>

            <div className="border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-700 font-bold flex items-center justify-center text-xs">J</div>
                <span className="font-semibold text-gray-900">João Oliveira</span>
                <span className="text-gray-400 text-[10px] ml-auto">05/07/2025</span>
              </div>
              <p className="text-gray-600 leading-relaxed text-[11px]">
                Muito bom! Instalei sem nenhum problema. Interface limpa e intuitiva.
              </p>
            </div>

            <div className="border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-700 font-bold flex items-center justify-center text-xs">A</div>
                <span className="font-semibold text-gray-900">Ana Costa</span>
                <span className="text-gray-400 text-[10px] ml-auto">01/07/2025</span>
              </div>
              <p className="text-gray-600 leading-relaxed text-[11px]">
                Perfeito, atendeu todas as minhas necessidades. Nota 10!
              </p>
            </div>
          </div>

          <button className="mt-4 text-[#01875f] font-semibold text-xs hover:underline cursor-pointer">
            Ver todas as avaliações
          </button>
        </section>

        {/* Rodapé Oficial Google Play */}
        <footer className="mt-10 pt-6 border-t border-gray-100 text-gray-500 text-[11px]">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 mb-2 text-center">
            <span className="hover:underline cursor-pointer">Google Play</span>
            <span>·</span>
            <span className="hover:underline cursor-pointer">Play Pass</span>
            <span>·</span>
            <span className="hover:underline cursor-pointer">Termos de Serviço</span>
            <span>·</span>
            <span className="hover:underline cursor-pointer">Privacidade</span>
          </div>
          <div className="text-center text-[10px] text-gray-400">
            Todos os preços incluem Tributo.
          </div>
        </footer>
      </main>
    </div>
  );
}
