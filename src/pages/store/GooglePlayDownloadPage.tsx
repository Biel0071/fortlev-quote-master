import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CloudUpload,
  HelpCircle,
  Info,
  Lock,
  MessageCircle,
  Search,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import storeLogoPure from "@/assets/store-logo-pure.png";
import festivalCaixasDesktop from "@/assets/banners/festival-caixas-desktop.png";
import { GooglePlayTriangleIcon } from "@/components/store/TrustAndAppBadges";
import { useStoreContact } from "@/hooks/useStoreContact";
import { cloud } from "@/lib/cloud";
import { encodeEncryptedLink } from "@/utils/encryptedLinks";
import { collectAndTrackEvent } from "@/modules/tracking/trackingService";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const PREVIEW_CARDS = [
  {
    id: "catalog",
    badge: "LOJA OFICIAL",
    title: "Catálogo Completo de Obras",
    subtitle: "Cimentos, caixas d'água Fortlev, blocos, agregados e ferragens em um clique.",
    accent: "from-[#062a57] via-[#0c3f7a] to-[#0e5a9e]",
    highlights: ["Ofertas do dia", "Pix com desconto", "Entrega regional"],
  },
  {
    id: "tracking",
    badge: "RASTREIO AO VIVO",
    title: "Acompanhe sua Entrega",
    subtitle: "Consulte rota compartilhada, CD mais próximo e horários em tempo real.",
    accent: "from-[#0f172a] via-[#1e293b] to-[#334155]",
    highlights: ["Código e CPF", "Etapas da carga", "Previsão por hora"],
  },
  {
    id: "promo",
    badge: "CUPOM EXCLUSIVO",
    title: "Ative 10% OFF no Aplicativo",
    subtitle: "Orçamento instantâneo, suporte no WhatsApp e acompanhamento direto.",
    accent: "from-[#015c41] via-[#01875f] to-[#059669]",
    highlights: ["Desconto no app", "Atendimento direto", "Apenas Android"],
  },
];

const RATING_BARS = [
  { stars: 5, pct: 86 },
  { stars: 4, pct: 10 },
  { stars: 3, pct: 2 },
  { stars: 2, pct: 1 },
  { stars: 1, pct: 1 },
];

const REVIEWS = [
  {
    initial: "M",
    name: "Maria Silva",
    date: "14 de nov. de 2026",
    text: "Aplicativo leve e muito prático para pedir material de construção e acompanhar a entrega pelo celular.",
  },
  {
    initial: "J",
    name: "João Oliveira",
    date: "09 de nov. de 2026",
    text: "Comprei caixa d'água e cimento no Material Online e consegui rastrear cada etapa da entrega sem complicação.",
  },
  {
    initial: "A",
    name: "Ana Costa",
    date: "02 de nov. de 2026",
    text: "Interface rápida, nota 10. Atendimento direto no WhatsApp quando precisei tirar dúvida do frete.",
  },
];

export default function GooglePlayDownloadPage() {
  const contact = useStoreContact();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [configuredApkUrl, setConfiguredApkUrl] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showInstalledModal, setShowInstalledModal] = useState(false);

  const waDigits = (contact.phoneDigits || "31973484203").replace(/\D/g, "");
  const waHref = `https://wa.me/${waDigits.startsWith("55") && waDigits.length >= 12 ? waDigits : `55${waDigits}`}?text=${encodeURIComponent(
    "Olá! Instalei o app Material Online e quero ativar meu cupom de 10% OFF.",
  )}`;

  useEffect(() => {
    document.title = "Material Online - Apps no Google Play";
  }, []);

  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    let alive = true;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const tokenParam = searchParams.get("apk_token") || searchParams.get("token");
      const apkParam = searchParams.get("apk") || searchParams.get("apk_url") || searchParams.get("download_url");

      if (tokenParam) {
        const base = import.meta.env.VITE_SUPABASE_URL || "https://dprllimstkssmowjvdow.supabase.co";
        setConfiguredApkUrl(`${base}/functions/v1/download-apk-public?token=${encodeURIComponent(tokenParam)}`);
        return;
      }

      if (apkParam) {
        setConfiguredApkUrl(decodeURIComponent(apkParam));
        return;
      }
    } catch { /* ignore URL parsing error */ }

    cloud
      .from("app_config")
      .select("value")
      .eq("key", "app_download_url")
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        const val = typeof data?.value === "string" ? data.value.trim() : "";
        if (val) {
          setConfiguredApkUrl(val);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  const handleInstallClick = () => {
    if (downloadProgress !== null && !isCompleted) return;
    try {
      const token =
        localStorage.getItem("tracking_session_token_v1") ||
        sessionStorage.getItem("tracking_session_token_temp_v1") ||
        "";
      if (token) {
        void collectAndTrackEvent({
          sessionToken: token,
          consentGiven: true,
          event: {
            type: "download_apk",
            path: "/google-play",
            metadata: { channel: "app", label: "material_online_install", encrypted: true },
          },
        });
      }
    } catch { /* ignore tracking errors */ }
    setDownloadProgress(0);
    let progress = 0;
    const interval = window.setInterval(async () => {
      progress = Math.min(100, progress + (progress < 40 ? 9 : progress < 80 ? 7 : 5));
      setDownloadProgress(Math.floor(progress));
      if (progress >= 100) {
        window.clearInterval(interval);
        setIsCompleted(true);
        if (deferredPrompt) {
          try {
            await deferredPrompt.prompt();
            await deferredPrompt.userChoice;
          } catch { /* ignore prompt dismissal errors */ }
          setDeferredPrompt(null);
        } else if (configuredApkUrl) {
          const link = document.createElement("a");
          link.href = configuredApkUrl;
          link.download = "Material_Online.apk";
          link.rel = "noopener noreferrer";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        setShowInstalledModal(true);
      }
    }, 55);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Material Online",
          text: "Baixe o aplicativo Material Online no Google Play:",
          url: window.location.href,
        });
        return;
      } catch { /* fallback to clipboard copy */ }
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch { /* ignore clipboard permission errors */ }
  };

  return (
    <div className="min-h-screen bg-white text-[#202124] antialiased selection:bg-[#01875f] selection:text-white">
      {/* Header estilo Google Play Studio */}
      <header className="sticky top-0 z-40 border-b border-[#e8eaed] bg-white">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link to="/google-play" className="flex items-center gap-2 select-none" aria-label="Google Play">
              <GooglePlayTriangleIcon className="h-6 w-6 shrink-0" />
              <span className="text-[18px] font-medium tracking-tight text-[#5f6368]">Google Play</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1" aria-label="Categorias Google Play">
              <span className="px-3 py-4 text-xs font-medium text-[#5f6368]">Jogos</span>
              <span className="relative px-3 py-4 text-xs font-semibold text-[#01875f]">
                Apps
                <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-t bg-[#01875f]" />
              </span>
              <span className="px-3 py-4 text-xs font-medium text-[#5f6368]">Livros</span>
              <span className="px-3 py-4 text-xs font-medium text-[#5f6368]">Crianças</span>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={encodeEncryptedLink("/", { source: "/google-play", label: "gp_back_home", channel: "app" })}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#dadce0] bg-white px-3 py-1.5 text-xs font-medium text-[#3c4043] hover:bg-[#f1f3f4] transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Voltar à loja</span>
            </Link>
            <button
              type="button"
              onClick={handleShare}
              className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full text-[#5f6368] hover:bg-[#f1f3f4]"
              aria-label="Pesquisar"
            >
              <Search className="h-4 w-4" />
            </button>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#5f6368] hover:bg-[#f1f3f4]"
              aria-label="Ajuda no WhatsApp"
              title="Ajuda"
            >
              <HelpCircle className="h-4 w-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Hero escuro inspirado no Google Play Studio com banner da loja ao fundo */}
      <section className="relative overflow-hidden border-b border-[#2d2e30] bg-[#202124] text-white">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden md:block w-[58%] max-w-[820px]">
          <img
            src={festivalCaixasDesktop}
            alt=""
            className="h-full w-full object-cover object-right opacity-45"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, #202124 0%, #202124 22%, rgba(32,33,36,0.85) 55%, rgba(32,33,36,0.35) 100%)",
            }}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-[1280px] px-4 sm:px-6 py-7 sm:py-10">
          <div className="max-w-xl space-y-5">
            <div className="flex items-start gap-4 sm:gap-5">
              <div className="shrink-0 rounded-[18px] bg-white p-2 shadow-lg ring-1 ring-white/20">
                <img
                  src={storeLogoPure}
                  alt="Logo Material Online"
                  className="h-14 w-14 sm:h-[72px] sm:w-[72px] object-contain"
                />
              </div>
              <div className="min-w-0 pt-0.5">
                <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">Material Online</h1>
                <p className="mt-1 text-sm font-medium text-[#00c48c]">
                  Material Online · Materiais de Construção
                </p>
                <p className="mt-0.5 text-xs text-[#9aa0a6]">
                  Disponível apenas no Google Play · Entregas & Rastreio
                </p>
              </div>
            </div>

            {/* Métricas Google Play Studio: 4,8 ★ | 100 mil+ downloads | Livre */}
            <div className="flex flex-wrap items-center gap-5 sm:gap-7 py-1">
              <div>
                <div className="flex items-center gap-1 text-sm font-semibold text-white">
                  <span>4,8</span>
                  <Star className="h-3.5 w-3.5 fill-white text-white" />
                </div>
                <div className="text-[11px] text-[#9aa0a6]">350 avaliações</div>
              </div>

              <div className="h-6 w-px bg-white/15" />

              <div>
                <div className="text-sm font-semibold text-white">100 mil+</div>
                <div className="text-[11px] text-[#9aa0a6]">downloads</div>
              </div>

              <div className="h-6 w-px bg-white/15" />

              <div className="flex flex-col items-start">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-[#01875f] text-[10px] font-bold text-white">
                  L
                </span>
                <span className="mt-0.5 text-[11px] text-[#9aa0a6]">Classificação Livre</span>
              </div>
            </div>

            {/* Ações principais */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleInstallClick}
                className="relative overflow-hidden inline-flex h-11 min-w-[190px] items-center justify-center rounded-lg bg-[#01875f] px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#017250] cursor-pointer"
              >
                {downloadProgress !== null && (
                  <span
                    className="absolute inset-y-0 left-0 bg-[#005f42]/70 transition-[width] duration-75"
                    style={{ width: `${downloadProgress}%` }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {downloadProgress !== null && downloadProgress < 100 ? (
                    <span>Instalando ({downloadProgress}%)</span>
                  ) : isCompleted ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Instalar novamente</span>
                    </>
                  ) : (
                    <span>Instalar</span>
                  )}
                </span>
              </button>

              <Link
                to={encodeEncryptedLink("/", { source: "/google-play", label: "gp_open_store", channel: "app" })}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-white/25 px-5 text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                Abrir loja online
              </Link>

              <button
                type="button"
                onClick={handleShare}
                className="inline-flex h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-[#00c48c] hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Share2 className="h-4 w-4" />
                <span>Compartilhar</span>
              </button>
            </div>

            <p className="text-[11px] leading-relaxed text-[#9aa0a6]">
              Disponível exclusivamente para dispositivos Android no Google Play. Ao baixar ou instalar o app Material
              Online, você concorda com os Termos de Serviço e Privacidade.
            </p>
          </div>
        </div>
      </section>

      {/* Corpo em 2 colunas fiel ao Google Play Studio */}
      <main className="mx-auto max-w-[1280px] px-4 sm:px-6 py-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 lg:gap-12">
          {/* Coluna Principal */}
          <div className="min-w-0 space-y-8">
            {/* Carrossel de Prévias */}
            <section aria-label="Capturas de tela do aplicativo">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {PREVIEW_CARDS.map((card) => (
                  <div
                    key={card.id}
                    className={`rounded-2xl bg-gradient-to-br ${card.accent} p-5 text-white shadow-sm flex flex-col justify-between min-h-[185px]`}
                  >
                    <div className="space-y-2">
                      <span className="inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold tracking-wider">
                        {card.badge}
                      </span>
                      <h2 className="text-base font-bold leading-snug">{card.title}</h2>
                      <p className="text-xs text-white/85 leading-relaxed">{card.subtitle}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {card.highlights.map((h) => (
                        <span
                          key={h}
                          className="rounded-md bg-black/25 px-2 py-0.5 text-[10px] font-medium text-white/95"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Sobre este app */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#202124]">Sobre este app</h2>
                <Link to="/loja" className="text-[#01875f] hover:opacity-80" aria-label="Ver catálogo">
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
              <p className="text-sm leading-relaxed text-[#5f6368]">
                O aplicativo oficial <strong>Material Online</strong> coloca todo o estoque de materiais de construção na
                palma da sua mão: cimento, caixas d'água, blocos, areia, brita, hidráulica, elétrica e ferramentas com
                rastreamento de entrega ao vivo e atendimento direto no WhatsApp.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-1 text-sm">
                <div>
                  <div className="text-xs font-semibold text-[#202124]">Atualizado em</div>
                  <div className="text-xs text-[#5f6368] mt-0.5">18 de nov. de 2026</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#202124]">Disponível em</div>
                  <div className="text-xs font-medium text-[#01875f] mt-0.5">Apenas Android (Google Play)</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {["Compras", "Materiais de Construção", "Orçamentos", "Rastreio ao vivo"].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[#dadce0] px-3 py-1 text-xs font-medium text-[#5f6368]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>

            {/* Segurança dos dados */}
            <section className="space-y-3 border-t border-[#e8eaed] pt-7">
              <h2 className="text-lg font-semibold text-[#202124]">Segurança dos dados</h2>
              <p className="text-xs leading-relaxed text-[#5f6368]">
                Sua segurança começa ao entender como seus dados de compra e entrega são protegidos no Material Online.
              </p>
              <div className="rounded-2xl border border-[#dadce0] p-4 sm:p-5 space-y-4 text-xs text-[#3c4043]">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-[#5f6368]" />
                  <div>
                    <p className="font-medium text-[#202124]">Ambiente verificado com Google Safe Browsing</p>
                    <p className="text-[#5f6368] mt-0.5">Navegação protegida por SSL e auditoria de integridade.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CloudUpload className="h-5 w-5 shrink-0 text-[#5f6368]" />
                  <div>
                    <p className="font-medium text-[#202124]">Coleta mínima para entrega e nota fiscal</p>
                    <p className="text-[#5f6368] mt-0.5">Nome, telefone, endereço de entrega e acompanhamento.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 shrink-0 text-[#5f6368]" />
                  <p className="font-medium text-[#202124]">Os dados são criptografados em trânsito (HTTPS/TLS)</p>
                </div>
                <div className="flex items-start gap-3">
                  <Trash2 className="h-5 w-5 shrink-0 text-[#5f6368]" />
                  <p className="font-medium text-[#202124]">Você pode solicitar a exclusão dos seus dados a qualquer momento</p>
                </div>
              </div>
            </section>

            {/* Classificações e resenhas (4,8 ★) */}
            <section className="space-y-5 border-t border-[#e8eaed] pt-7">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-[#202124]">Classificações e resenhas</h2>
                <span className="inline-flex items-center gap-1 text-xs text-[#5f6368]">
                  As notas são verificadas <Info className="h-3.5 w-3.5" />
                </span>
              </div>

              <div className="grid grid-cols-[auto_1fr] items-center gap-6 sm:gap-10">
                <div>
                  <div className="text-5xl font-normal tracking-tight text-[#202124]">4,8</div>
                  <div className="mt-1 flex items-center gap-0.5 text-[#01875f]">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-[#01875f] text-[#01875f]" />
                    ))}
                  </div>
                  <div className="mt-1 text-xs text-[#5f6368]">350 avaliações</div>
                </div>

                <div className="space-y-1.5">
                  {RATING_BARS.map((bar) => (
                    <div key={bar.stars} className="flex items-center gap-3 text-xs text-[#5f6368]">
                      <span className="w-2 text-right font-medium">{bar.stars}</span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#e8eaed]">
                        <div
                          className="h-full rounded-full bg-[#01875f]"
                          style={{ width: `${bar.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-2">
                {REVIEWS.map((rev) => (
                  <div key={rev.name} className="border-b border-[#e8eaed] pb-4 last:border-b-0">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8eaed] text-xs font-semibold text-[#3c4043]">
                        {rev.initial}
                      </div>
                      <span className="text-sm font-medium text-[#202124]">{rev.name}</span>
                      <span className="ml-auto text-[11px] text-[#5f6368]">{rev.date}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-0.5 text-[#01875f]">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <Star key={i} className="h-3 w-3 fill-[#01875f] text-[#01875f]" />
                      ))}
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#5f6368]">{rev.text}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Barra Lateral Estilo Google Play Studio */}
          <aside className="space-y-5">
            <div className="rounded-xl border border-[#dadce0] p-4 flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#202124] text-sm font-bold text-white">
                L
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#202124]">Classificação Livre</h3>
                <p className="text-xs text-[#5f6368] mt-0.5">Livre para todos os públicos</p>
              </div>
            </div>

            <div className="rounded-xl bg-[#202124] p-5 text-white space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#01875f]/20 text-[#00c48c]">
                  <Smartphone className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold">Disponível no Google Play</h3>
              </div>
              <p className="text-xs text-[#9aa0a6] leading-relaxed">
                Exclusivo para celulares e tablets Android. Acompanhe seu pedido e receba 10% OFF no app Material Online.
              </p>
              <ul className="space-y-2 border-t border-white/10 pt-3 text-xs text-white/90">
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#00c48c] shrink-0" />
                  <span>Verificado Google Safe Browsing</span>
                </li>
                <li className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-[#00c48c] shrink-0" />
                  <span>Rastreamento de entrega ao vivo</span>
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#00c48c] shrink-0" />
                  <span>Ofertas exclusivas Material Online</span>
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-[#dadce0] p-4 space-y-2.5">
              <h3 className="text-sm font-semibold text-[#202124]">Requisitos mínimos</h3>
              <ul className="space-y-1.5 text-xs text-[#5f6368]">
                <li>
                  <strong className="text-[#202124]">SO:</strong> Android 8.0 ou superior
                </li>
                <li>
                  <strong className="text-[#202124]">Loja:</strong> Apenas Google Play (Android)
                </li>
                <li>
                  <strong className="text-[#202124]">Espaço:</strong> 18 MB livres
                </li>
              </ul>
            </div>
          </aside>
        </div>

        {/* Rodapé discreto Google Play */}
        <footer className="mt-12 border-t border-[#e8eaed] pt-6 text-xs text-[#5f6368]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-medium text-[#202124]">Google Play · Material Online</span>
              <span>Privacidade</span>
              <span>Termos de Serviço</span>
              <Link
                to={encodeEncryptedLink("/rastreio", { source: "/google-play", label: "gp_footer_tracking", channel: "app" })}
                className="text-[#01875f] font-medium hover:underline"
              >
                Rastrear Pedido
              </Link>
              <Link
                to={encodeEncryptedLink("/", { source: "/google-play", label: "gp_footer_home", channel: "app" })}
                className="text-[#01875f] font-medium hover:underline"
              >
                Ir para a loja
              </Link>
            </div>
            <span>Brasil (Português)</span>
          </div>
        </footer>
      </main>

      {/* Modal pós-instalação */}
      {showInstalledModal ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Aplicativo Material Online preparado"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowInstalledModal(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowInstalledModal(false)}
              aria-label="Fechar"
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={storeLogoPure}
              alt="Logo Material Online"
              className="mx-auto h-14 w-14 rounded-2xl border border-gray-100 p-1.5 object-contain"
            />
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-[#202124]">Material Online</h3>
              <p className="text-xs text-[#5f6368] leading-relaxed">
                Aplicativo preparado! Você já pode abrir a loja direto ou confirmar no WhatsApp para ativar 10% OFF.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Confirmar no WhatsApp (10% OFF)</span>
              </a>
              <Link
                to={encodeEncryptedLink("/", { source: "/google-play", label: "gp_modal_open_store", channel: "app" })}
                onClick={() => setShowInstalledModal(false)}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 text-sm font-medium text-[#202124] hover:bg-gray-50"
              >
                Abrir loja Material Online
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
