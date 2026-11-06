/**
 * Google Play Store Studio & Live Editor
 * Real-time two-way synchronization, image uploads, preset management & interactive modals
 */

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================================================
  // 1. Preset Configurations
  // ==========================================================================
  const PRESETS = {
    sniper3d: {
      appTitle: "Sniper 3D:  Jogos de tiro",
      developer: "Wildlife Studios",
      subtitle: "Contém anúncios · Compras no app",
      appIconUrl: "assets/sniper_app_icon.png",
      ratingVal: "4,7",
      ratingCount: "18,4 mi avaliações",
      downloadsVal: "500 mi+",
      downloadsLabel: "downloads",
      heroBgUrl: "assets/hero_key_art.png",
      installBtn: "Instalar no Windows",
      installOtherBtn: "Instalar em outros locais",
      trailerBtn: "Trailer",
      trailerYoutube: "5F_fNlGqj0o",
      disclaimer: "É necessário ter o Google Play Games no PC para instalar este jogo no Windows. Ao fazer o download do app e do jogo, você concorda com os Termos de Serviço do Google e do Google Play. Saiba mais.",
      aboutText: "Prepare-se para liberar a melhor experiência Sniper 3D com o jogo de tiro mais emocionante e cheio de ação de todos os tempos! Sniper 3d é o jogo definitivo de armas grátis que coloca você na pele de um assassino mortal. Mergulhe em missões off-line de alta intensidade e mostre suas habilidades de tiro nesta aventura de atirador cheio de adrenalina. Você é o melhor atirador? Prove isso no Sniper 3d!",
      updatedAt: "29 de set. de 2026",
      platforms: "Android, Windows*",
      tags: ["Ação", "Tiro", "Atirador", "Casuais", "Um jogador", "Estilizado", "Armas", "Arma de fogo", "Assassino", "Off-line"],
      intelNote: "*Com a tecnologia Intel®",
      eventBadge: "Termina em 10/29",
      eventTitle: "Horizonte Eterno",
      eventBannerUrl: "assets/event_art_clean.png",
      featureBadge: "Data especial",
      featureTitle: "Celebração de Aniversário Sniper 3D",
      featureDesc: "Participe de desafios exclusivos da comunidade e desbloqueie armamentos lendários limitados.",
      featureBannerUrl: "assets/featured_art_clean.png",
      ratingBadge: "18",
      ratingTitle: "Classificação 18 anos",
      ratingDesc: "Violência Extrema",
      pcTitle: "Jogar no PC",
      pcSubtitle: "Acesse este jogo no seu PC Windows com o Google Play Games",
      reqOs: "Windows 10 (v2004)",
      reqStorage: "SSD com 10 GB de espaço de armazenamento disponível",
      reqGpu: "GPU Intel® UHD Graphics 630 ou comparável",
      reqCpu: "4 núcleos físicos de CPU (alguns jogos exigem uma CPU Intel)",
      screenshots: [
        "assets/screenshot_snow_clean.png",
        "assets/screenshot_paris_clean.png",
        "assets/screenshot_3.jpg",
        "assets/screenshot_4.jpg"
      ],
      installUrl: "",
      arrowText: "clique em abrir<br>para Instalar o app",
      installMode: "direct_flow"
    },
    jadlog: {
      appTitle: "myJadlog",
      developer: "Geopost SA",
      subtitle: "Contém anúncios · Grátis",
      appIconUrl: "https://play-lh.googleusercontent.com/hBTzeHF1ifGrzTS3sqxqoC6PveKPNO05HAnKswwJyIW73SG56VdLt1MEEqTfG0uMAoAltgvhCtF5xaABa3uYKg=w240-h480-rw",
      ratingVal: "4,1",
      ratingCount: "902 avaliações",
      downloadsVal: "100 mil+",
      downloadsLabel: "downloads",
      heroBgUrl: "assets/hero_key_art.png",
      installBtn: "Instalar",
      installOtherBtn: "Instalar em outros dispositivos",
      installUrl: "https://meudownload.store/?dl=build_6ae9da9d36b351.23389860&name=myJadlog",
      arrowText: "clique em abrir<br>para Instalar o app",
      installMode: "direct_flow",
      autoStartDownload: false,
      trailerBtn: "Trailer",
      trailerYoutube: "5F_fNlGqj0o",
      disclaimer: "Ao fazer o download do app, você concorda com os Termos de Serviço do Google e do Google Play.",
      aboutText: "O myJadlog te oferece diversos serviços:\n\n● Saiba onde estão todas as suas encomendas: cadastre-se e verifique na hora o status de todas as suas encomendas\n\n● Acesso às informações sobre suas encomendas, rastreamento em tempo real e localização.\n\n● Não estará em casa? Você pode optar por alterar a data de entrega ou escolher um ponto Pickup para recebê-la.\n\n● Escolha facilmente a franquia ou ponto Pickup mais perto de você, utilizando a sua localização e filtros mais relevantes (horário de funcionamento, estacionamento, etc)",
      updatedAt: "12 de out. de 2026",
      platforms: "Android, iOS",
      tags: ["Produtividade", "Rastreamento", "Entregas", "Logística"],
      intelNote: "*Compatível com todos os dispositivos móveis",
      eventBadge: "Oficial",
      eventTitle: "myJadlog no seu Celular",
      eventBannerUrl: "assets/event_art_clean.png",
      featureBadge: "Atualização",
      featureTitle: "Rastreamento e Pontos Pickup",
      featureDesc: "Acesse em tempo real todas as suas remessas e altere datas de entrega com um toque.",
      featureBannerUrl: "assets/featured_art_clean.png",
      ratingBadge: "L",
      ratingTitle: "Classificação Livre",
      ratingDesc: "Livre para todos os públicos",
      pcTitle: "Disponível no Smartphone",
      pcSubtitle: "Instale no seu celular para acompanhar remessas e notificações em tempo real",
      reqOs: "Android 8.0 ou superior",
      reqStorage: "45 MB de espaço livre",
      reqGpu: "Compatível com qualquer GPU móvel",
      reqCpu: "Processador Quad-core ou superior",
      screenshots: [
        "https://play-lh.googleusercontent.com/UqyraePi4mDUGAfkcMMGj9IQh0xFwdX4Yu1xYgP3Ye0ppFhTwaGtcR6CGdH8Dm5pOzwXgFt8A02m7oPZz4cUpA=w526-h296-rw",
        "https://play-lh.googleusercontent.com/BbFrlbg8oIXw9I7JFULsjZNuPoVVN-dwJXbxbpdLGvox0waEsUAQblMpDMopj8SJ36NoR8BfW1MoUFsHzPgdqqc=w526-h296-rw",
        "https://play-lh.googleusercontent.com/jDJtIJgiZnUK4XFL1pqsPGpAOcjpQ2TAS8XtoXIX6uPjBYBxxOC2yi3onY8ocwNx3GetemikbACArT6PtXR0BA=w526-h296-rw",
        "https://play-lh.googleusercontent.com/KD_EsmXKsWenaIuHiJ7TJKLn61dxon6wXLl-WDcnLRKDrpLgKcMbAmwUVPHvQYuL7nwiB5ZRUCRhXLHKdkvZSw=w526-h296-rw",
        "https://play-lh.googleusercontent.com/pq8GKdjMbMSwdCtzGL1XPhm1Txk5tDsaA6wY4BAmzXRgYemOQoZL1UOkhXmpCwT4-KLSa2fNB2X6te-a_JtAGA=w526-h296-rw"
      ],
      bar5: "65",
      bar4: "15",
      bar3: "8",
      bar2: "4",
      bar1: "8",
      rev1Name: "Ivete Ogi",
      rev1Date: "28 de agosto de 2026",
      rev1Stars: 1,
      rev1Text: "péssimo atendimento...na vdd só um robô atende e informa a data limite para recebimento da mercadoria. Eles tem parceria com o Superfrete, cobram mais caro para que a entrega seja feita em 3 dias e nunca cumprem. Deixaram no ponto uma compra que fiz dia 20 e no dia 26 colocaram informativo que eu estava ausente, sendo que não sai de casa, agora a próxima tentativa é até o dia 31.",
      rev2Name: "Welington Mendes leandro",
      rev2Date: "27 de agosto de 2026",
      rev2Stars: 1,
      rev2Text: "Péssima experiência com a Jadlog. Toda vez que tenho uma entrega por essa transportadora, tenho problemas. Eles colocam no sistema que o local é de ‘difícil acesso’, sendo que o caminho é aberto e asfaltado e outras transportadoras, como Mercado Livre, Shopee e AliExpress, entregam normalmente no mesmo endereço. Parece que nem tentam realizar a entrega.",
      rev3Name: "Charles Fernandes",
      rev3Date: "7 de julho de 2026",
      rev3Stars: 1,
      rev3Text: "infelizmente prá mim não funcionou, porque na maioria dos envios eu não tenho o número da encomenda. Prá realmente funcionar teria que ter a possibilidade de rastreamento pelo número do CPF. Aí sim, teria sido válido a instalação do app. É uma sugestão e crítica construtiva.",
      relatedApps: [
        {
          name: "Mais Saúde",
          developer: "Raia Drogasil S.A.",
          rating: "4,7",
          icon: "https://play-lh.googleusercontent.com/9rIwBBTJ7K2TCIlj0_gRs88MnAQtHYVDNg7clPqKVYYW_46WAfW9fuCs5bd09pgXO_8JEtMTZGhyBUDefDwCbw=s64-rw"
        },
        {
          name: "CPFL Energia",
          developer: "CPFL Energia",
          rating: "4,8",
          icon: "https://play-lh.googleusercontent.com/B4q-BK5FegN3cN5LH1_Kd6wixZGjCcGrq7SGmqLekb6808c7Mlgerd-DpXXdRqQxJtelLA9x1w1Elb-A5hXH=s64-rw"
        },
        {
          name: "Zattini: Comprar Roupas Online",
          developer: "Grupo Netshoes",
          rating: "4,5",
          icon: "https://play-lh.googleusercontent.com/l5V9uPyF2eUP8JLVqVMvpque6Zkg3rY4Rp2UxI5aYC9v_--woWdU5L4VfnHI5JzHHTh0QZWC8feiafibvK6Z=s64-rw"
        },
        {
          name: "Caju - Benefícios por inteiro",
          developer: "Caju",
          rating: "4,7",
          icon: "https://play-lh.googleusercontent.com/gZ30d07fvm6p_2kW3-2wiOfTI3MtzQkAZWwzvUs0MhaNUS8cgUDmLtJnIc1bkq-qIUDRvMautvrfvwebE5v7=s64-rw"
        },
        {
          name: "Next Fit",
          developer: "Next Fit",
          rating: "4,9",
          icon: "https://play-lh.googleusercontent.com/mmbL_OZFjGGJemk6kLo0q70YywvFsDrZ48SSu5gQDdPKW8GgfMR5Gl2bH_YDlkzXC4UsFcXWPU8NI4iI4TYJ=s64-rw"
        },
        {
          name: "Mercos - Vendas e Pedidos B2B",
          developer: "Simplest Software",
          rating: "4,9",
          icon: "https://play-lh.googleusercontent.com/Kj6eTaYPOGd1uQICoNtAMhShRrp6mwQAAwiXJilYa_MPiYL8EUklJ8IBvSXYkTyNSmLEHwCjvQaxS29H2OIuBp4=s64-rw"
        }
      ]
    },
    freefire: {
      appTitle: "Free Fire MAX",
      developer: "Garena International I",
      subtitle: "Contém anúncios · Compras no app",
      appIconUrl: "https://play-lh.googleusercontent.com/WkWqK6b6hT4yVb6M8sKjD6D7J9qL1tQ8yVb6M8sKjD6D7J9qL1tQ=s96",
      ratingVal: "4,4",
      ratingCount: "25,8 mi avaliações",
      downloadsVal: "100 mi+",
      downloadsLabel: "downloads",
      heroBgUrl: "assets/screenshot_3.jpg",
      installBtn: "Instalar no Windows",
      installOtherBtn: "Instalar em outros dispositivos",
      trailerBtn: "Assistir Trailer",
      trailerYoutube: "jZ_7n6uX1y0",
      disclaimer: "Jogue no PC com gráficos aprimorados em Ultra HD e controles com suporte nativo a mouse e teclado.",
      aboutText: "Free Fire MAX foi projetado exclusivamente para oferecer uma experiência de gameplay premium no Battle Royale. Desfrute de uma variedade de modos de jogo emocionantes com todos os jogadores do Free Fire através da tecnologia exclusiva Firelink.",
      updatedAt: "01 de out. de 2026",
      platforms: "Android, Windows, iOS",
      tags: ["Battle Royale", "Ação", "Sobrevivência", "Tiro", "Multijogador", "Competitivo"],
      intelNote: "*Otimizado para processadores Intel Core",
      eventBadge: "Temporada 38",
      eventTitle: "Guerra de Guildas",
      eventBannerUrl: "assets/event_banner_full.png",
      featureBadge: "Passe Booyah",
      featureTitle: "Novo Arsenal Cromado",
      featureBannerUrl: "assets/featured_banner_complete.png",
      ratingBadge: "14",
      ratingTitle: "Classificação 14 anos",
      ratingDesc: "Violência, Linguagem Imprópria",
      pcTitle: "Jogar no PC com Google Play Games",
      pcSubtitle: "Jogue com 120 FPS estáveis e comandos mapeados no PC",
      reqOs: "Windows 10 / 11 64-bit",
      reqStorage: "SSD com 15 GB de espaço livre",
      reqGpu: "NVIDIA GeForce GTX 660 / AMD Radeon HD 7870",
      reqCpu: "Intel Core i5-4460 ou AMD FX-6300",
      screenshots: [
        "assets/screenshot_3.jpg",
        "assets/screenshot_4.jpg",
        "assets/screenshot_paris_2x.png"
      ]
    },
    minecraft: {
      appTitle: "Minecraft",
      developer: "Mojang Studios",
      subtitle: "Compras no app",
      appIconUrl: "https://play-lh.googleusercontent.com/VSwHQHgYYtUKUbZ1inciYwQWBfhdSIH3qphJyRxAcZAbAPAITUrhQmAEqSIQvEiRhw=s96",
      ratingVal: "4,6",
      ratingCount: "5,4 mi avaliações",
      downloadsVal: "50 mi+",
      downloadsLabel: "downloads",
      heroBgUrl: "assets/featured_banner_complete.png",
      installBtn: "Comprar por R$ 39,99",
      installOtherBtn: "Comprar para outro dispositivo",
      trailerBtn: "Trailer Oficial",
      trailerYoutube: "MmB9b5njVbA",
      disclaimer: "Crie, explore e sobreviva no seu próprio mundo infinito com amigos em diferentes plataformas.",
      aboutText: "Explore mundos infinitos e construa desde simples casas até os maiores castelos. Jogue no modo criativo com recursos ilimitados ou minere as profundezas no modo sobrevivência.",
      updatedAt: "15 de set. de 2026",
      platforms: "Windows, Android, Xbox",
      tags: ["Aventura", "Criatividade", "Construção", "Multijogador", "Sandbox", "Sobrevivência"],
      intelNote: "*Suporte completo a Ray Tracing em GPUs compatíveis",
      eventBadge: "Atualização",
      eventTitle: "Tricky Trials",
      eventBannerUrl: "assets/event_banner_full.png",
      featureBadge: "Marketplace",
      featureTitle: "Mundos em Destaque da Comunidade",
      featureBannerUrl: "assets/featured_banner_complete.png",
      ratingBadge: "10",
      ratingTitle: "Classificação 10 anos",
      ratingDesc: "Violência Fantasiosa",
      pcTitle: "Experiência Bedrock no PC",
      pcSubtitle: "Sincronize mundos entre PC, celular e console",
      reqOs: "Windows 10 versão 19041.0 ou superior",
      reqStorage: "10 GB de armazenamento",
      reqGpu: "Intel HD Graphics 4000 ou GeForce 700 Series",
      reqCpu: "Intel Core i3-3210 ou AMD A8-7600",
      screenshots: [
        "assets/screenshot_snow_2x.png",
        "assets/screenshot_3.jpg"
      ]
    },
    custom: {
      appTitle: "Meu Novo Jogo Incrível",
      developer: "Meu Estúdio Indie",
      subtitle: "Contém anúncios · Grátis para jogar",
      appIconUrl: "assets/sniper_app_icon.png",
      ratingVal: "5,0",
      ratingCount: "100 avaliações",
      downloadsVal: "10 mil+",
      downloadsLabel: "downloads",
      heroBgUrl: "assets/hero_backdrop_cleanest.png",
      installBtn: "Instalar no Windows",
      installOtherBtn: "Instalar no Celular",
      trailerBtn: "Trailer",
      trailerYoutube: "5F_fNlGqj0o",
      disclaimer: "Baixe e jogue a versão para PC oficial desenvolvida para Windows.",
      aboutText: "Escreva aqui a descrição detalhada do seu jogo ou aplicativo para a loja Google Play...",
      updatedAt: "Hoje",
      platforms: "Android, Windows",
      tags: ["Novo", "Ação", "Indie"],
      intelNote: "*Compatível com Windows 10 e 11",
      eventBadge: "Lançamento",
      eventTitle: "Grande Inauguração",
      eventBannerUrl: "assets/event_banner_full.png",
      featureBadge: "Destaque",
      featureTitle: "Semana de Estreia",
      featureBannerUrl: "assets/featured_banner_complete.png",
      ratingBadge: "L",
      ratingTitle: "Classificação Livre",
      ratingDesc: "Livre para todos os públicos",
      pcTitle: "Jogar no PC",
      pcSubtitle: "Aproveite a melhor experiência em tela grande",
      reqOs: "Windows 10",
      reqStorage: "5 GB",
      reqGpu: "GPU integrada compatível com DirectX 11",
      reqCpu: "Intel Core i3 ou superior",
      screenshots: [
        "assets/screenshot_snow_2x.png",
        "assets/screenshot_paris_2x.png"
      ]
    }
  };

  // State object
  let state = loadPersistedState() || JSON.parse(JSON.stringify(PRESETS.sniper3d));

  function loadPersistedState() {
    try {
      const saved = localStorage.getItem('google_play_studio_state_v3');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not read from localStorage', e);
    }
    return null;
  }

  function persistState() {
    try {
      localStorage.setItem('google_play_studio_state_v3', JSON.stringify(state));
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }
  }

  // ==========================================================================
  // 2. UI Elements Mapping
  // ==========================================================================

  // Inputs
  const inputAppTitle = document.getElementById('inputAppTitle');
  const inputDeveloper = document.getElementById('inputDeveloper');
  const inputSubtitle = document.getElementById('inputSubtitle');
  const inputLogoUrl = document.getElementById('inputLogoUrl');
  const adminIconPreview = document.getElementById('adminIconPreview');
  const uploadLogoInput = document.getElementById('uploadLogoInput');
  const inputRating = document.getElementById('inputRating');
  const inputReviews = document.getElementById('inputReviews');
  const inputDownloads = document.getElementById('inputDownloads');
  const inputDownloadsLabel = document.getElementById('inputDownloadsLabel');

  const adminHeroPreview = document.getElementById('adminHeroPreview');
  const uploadHeroInput = document.getElementById('uploadHeroInput');
  const inputHeroUrl = document.getElementById('inputHeroUrl');
  const inputBannerMode = document.getElementById('inputBannerMode');
  const inputBannerColor = document.getElementById('inputBannerColor');
  const inputBannerOpacity = document.getElementById('inputBannerOpacity');
  const inputGooglePlayUrl = document.getElementById('inputGooglePlayUrl');
  const btnSyncGooglePlay = document.getElementById('btnSyncGooglePlay');
  const inputInstallBtn = document.getElementById('inputInstallBtn');
  const inputInstallUrl = document.getElementById('inputInstallUrl');
  const inputAutoStartDownload = document.getElementById('inputAutoStartDownload');
  const inputArrowText = document.getElementById('inputArrowText');
  const inputInstallMode = document.getElementById('inputInstallMode');
  const inputInstallOtherBtn = document.getElementById('inputInstallOtherBtn');
  const inputTrailerBtn = document.getElementById('inputTrailerBtn');
  const inputTrailerYoutube = document.getElementById('inputTrailerYoutube');
  const inputDisclaimer = document.getElementById('inputDisclaimer');

  const inputAboutText = document.getElementById('inputAboutText');
  const inputUpdatedAt = document.getElementById('inputUpdatedAt');
  const inputPlatforms = document.getElementById('inputPlatforms');
  const newTagInput = document.getElementById('newTagInput');
  const addTagBtn = document.getElementById('addTagBtn');
  const adminTagsList = document.getElementById('adminTagsList');
  const inputIntelNote = document.getElementById('inputIntelNote');

  const inputEventBadge = document.getElementById('inputEventBadge');
  const inputEventTitle = document.getElementById('inputEventTitle');
  const adminEventPreview = document.getElementById('adminEventPreview');
  const uploadEventInput = document.getElementById('uploadEventInput');

  const inputFeatureBadge = document.getElementById('inputFeatureBadge');
  const inputFeatureTitle = document.getElementById('inputFeatureTitle');
  const inputFeatureDesc = document.getElementById('inputFeatureDesc');
  const adminFeaturePreview = document.getElementById('adminFeaturePreview');
  const uploadFeatureInput = document.getElementById('uploadFeatureInput');

  const inputRatingBadge = document.getElementById('inputRatingBadge');
  const inputRatingTitle = document.getElementById('inputRatingTitle');
  const inputRatingDesc = document.getElementById('inputRatingDesc');
  const inputPcTitle = document.getElementById('inputPcTitle');
  const inputPcSubtitle = document.getElementById('inputPcSubtitle');

  const inputReqOs = document.getElementById('inputReqOs');
  const inputReqStorage = document.getElementById('inputReqStorage');
  const inputReqGpu = document.getElementById('inputReqGpu');
  const inputReqCpu = document.getElementById('inputReqCpu');

  const screenshotsManager = document.getElementById('screenshotsManager');
  const uploadNewScreenshotInput = document.getElementById('uploadNewScreenshotInput');

  // Display elements on page
  const displayAppTitle = document.getElementById('displayAppTitle');
  const displayDeveloper = document.getElementById('displayDeveloper');
  const displaySubtitle = document.getElementById('displaySubtitle');
  const displayAppIcon = document.getElementById('displayAppIcon');
  const displayRatingVal = document.getElementById('displayRatingVal');
  const displayRatingCount = document.getElementById('displayRatingCount');
  const displayDownloadsVal = document.getElementById('displayDownloadsVal');
  const displayDownloadsLabel = document.getElementById('displayDownloadsLabel');
  const heroSection = document.getElementById('heroSection');
  const heroKeyArtImg = document.getElementById('heroKeyArtImg');
  const displayInstallBtn = document.getElementById('displayInstallBtn');
  const displayInstallOtherBtn = document.getElementById('displayInstallOtherBtn');
  const displayTrailerBtn = document.getElementById('displayTrailerBtn');
  const downloadTrigger = document.getElementById('downloadTrigger');
  const iconLoaderContainer = document.getElementById('iconLoaderContainer');
  const pageOverlay = document.getElementById('pageOverlay');
  const openArrowIndicator = document.getElementById('openArrowIndicator');
  const displayArrowText = document.getElementById('displayArrowText');
  const progressFillMain = document.getElementById('progressFillMain');
  const btnLoaderMain = document.getElementById('btnLoaderMain');
  const displayDisclaimer = document.getElementById('displayDisclaimer');

  const carouselTrack = document.getElementById('carouselTrack');
  const displayAboutText = document.getElementById('displayAboutText');
  const displayUpdatedAt = document.getElementById('displayUpdatedAt');
  const displayPlatforms = document.getElementById('displayPlatforms');
  const displayTagsContainer = document.getElementById('displayTagsContainer');
  const displayIntelNote = document.getElementById('displayIntelNote');

  const displayEventBadge = document.getElementById('displayEventBadge');
  const displayEventTitle = document.getElementById('displayEventTitle');
  const displayEventBanner = document.getElementById('displayEventBanner');

  const displayFeatureBadge = document.getElementById('displayFeatureBadge');
  const displayFeatureTitle = document.getElementById('displayFeatureTitle');
  const displayFeatureDesc = document.getElementById('displayFeatureDesc');
  const displayFeatureBanner = document.getElementById('displayFeatureBanner');

  const displayRatingBadge = document.getElementById('displayRatingBadge');
  const displayRatingTitle = document.getElementById('displayRatingTitle');
  const displayRatingDesc = document.getElementById('displayRatingDesc');
  const displayPcTitle = document.getElementById('displayPcTitle');
  const displayPcSubtitle = document.getElementById('displayPcSubtitle');

  const displayReqOs = document.getElementById('displayReqOs');
  const displayReqStorage = document.getElementById('displayReqStorage');
  const displayReqGpu = document.getElementById('displayReqGpu');
  const displayReqCpu = document.getElementById('displayReqCpu');

  // Modals display elements
  const installModalTitle = document.getElementById('installModalTitle');
  const installModalSub = document.getElementById('installModalSub');
  const installModalIcon = document.getElementById('installModalIcon');
  const aboutModalAppHeading = document.getElementById('aboutModalAppHeading');
  const aboutModalFullDesc = document.getElementById('aboutModalFullDesc');
  const aboutModalUpdated = document.getElementById('aboutModalUpdated');
  const aboutModalRating = document.getElementById('aboutModalRating');
  const aboutModalDev = document.getElementById('aboutModalDev');
  const trailerIframe = document.getElementById('trailerIframe');

  // Toast
  const toast = document.getElementById('toast');
  let toastTimer = null;
  function showToast(message) {
    if (toastTimer) clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
  }

  // ==========================================================================
  // 3. Render State to Admin Form and Page
  // ==========================================================================
  function renderAll() {
    // Sync inputs
    inputAppTitle.value = state.appTitle || '';
    inputDeveloper.value = state.developer || '';
    inputSubtitle.value = state.subtitle || '';
    inputLogoUrl.value = state.appIconUrl || '';
    adminIconPreview.src = state.appIconUrl || 'assets/sniper_app_icon.png';
    inputRating.value = state.ratingVal || '';
    inputReviews.value = state.ratingCount || '';
    inputDownloads.value = state.downloadsVal || '';
    inputDownloadsLabel.value = state.downloadsLabel || '';

    adminHeroPreview.src = state.heroBgUrl || 'assets/hero_key_art.png';
    inputHeroUrl.value = state.heroBgUrl || '';
    if (inputBannerMode) inputBannerMode.value = state.bannerMode || 'right_art';
    if (inputBannerColor) inputBannerColor.value = state.bannerColor || '';
    if (inputBannerOpacity) inputBannerOpacity.value = state.bannerOpacity !== undefined ? state.bannerOpacity : 100;
    inputInstallBtn.value = state.installBtn || '';
    if (inputInstallUrl) inputInstallUrl.value = state.installUrl || '';
    if (inputAutoStartDownload) inputAutoStartDownload.checked = !!state.autoStartDownload;
    if (inputArrowText) inputArrowText.value = state.arrowText || 'clique em abrir<br>para Instalar o app';
    if (inputInstallMode) inputInstallMode.value = state.installMode || 'direct_flow';
    inputInstallOtherBtn.value = state.installOtherBtn || '';
    inputTrailerBtn.value = state.trailerBtn || '';
    inputTrailerYoutube.value = state.trailerYoutube || '';
    inputDisclaimer.value = state.disclaimer || '';

    inputAboutText.value = state.aboutText || '';
    inputUpdatedAt.value = state.updatedAt || '';
    inputPlatforms.value = state.platforms || '';
    inputIntelNote.value = state.intelNote || '';

    inputEventBadge.value = state.eventBadge || '';
    inputEventTitle.value = state.eventTitle || '';
    adminEventPreview.src = state.eventBannerUrl || 'assets/event_art_clean.png';

    inputFeatureBadge.value = state.featureBadge || '';
    if (inputFeatureTitle) inputFeatureTitle.value = state.featureTitle || '';
    if (inputFeatureDesc) inputFeatureDesc.value = state.featureDesc || '';
    adminFeaturePreview.src = state.featureBannerUrl || 'assets/featured_art_clean.png';

    inputRatingBadge.value = state.ratingBadge || '18';
    inputRatingTitle.value = state.ratingTitle || '';
    inputRatingDesc.value = state.ratingDesc || '';
    inputPcTitle.value = state.pcTitle || '';
    inputPcSubtitle.value = state.pcSubtitle || '';

    inputReqOs.value = state.reqOs || '';
    inputReqStorage.value = state.reqStorage || '';
    inputReqGpu.value = state.reqGpu || '';
    inputReqCpu.value = state.reqCpu || '';

    // Render Admin Tags
    renderAdminTags();

    // Render Admin Screenshots
    renderAdminScreenshots();

    // Sync Page Display
    displayAppTitle.innerHTML = escapeHtml(state.appTitle).replace(/:\s+/g, ': &nbsp;');
    displayDeveloper.textContent = state.developer;
    displaySubtitle.textContent = state.subtitle;
    displayAppIcon.src = state.appIconUrl;
    displayRatingVal.textContent = state.ratingVal;
    displayRatingCount.textContent = state.ratingCount;
    displayDownloadsVal.textContent = state.downloadsVal;
    displayDownloadsLabel.textContent = state.downloadsLabel;

    if (heroKeyArtImg) {
      heroKeyArtImg.src = state.heroBgUrl || 'assets/hero_key_art.png';
      applyBannerStyles();
    }
    displayInstallBtn.textContent = state.installBtn;
    displayInstallOtherBtn.textContent = state.installOtherBtn;
    displayTrailerBtn.textContent = state.trailerBtn;
    if (downloadTrigger) {
      downloadTrigger.href = state.installUrl || '#';
    }
    if (displayArrowText) {
      displayArrowText.innerHTML = state.arrowText || 'clique em abrir<br>para Instalar o app';
    }
    
    // Disclaimer format
    displayDisclaimer.innerHTML = `${escapeHtml(state.disclaimer)} 
      <a href="#" class="disclaimer-link">Termos de Serviço do Google <span class="material-symbols-outlined ext-icon">open_in_new</span></a> e do 
      <a href="#" class="disclaimer-link">Google Play<span class="material-symbols-outlined ext-icon">open_in_new</span></a>. 
      <a href="#" class="disclaimer-link">Saiba mais.<span class="material-symbols-outlined ext-icon">open_in_new</span></a>`;

    // About & Metadata
    displayAboutText.textContent = state.aboutText;
    displayUpdatedAt.textContent = state.updatedAt;
    displayPlatforms.innerHTML = `${escapeHtml(state.platforms).replace('Windows*', '<a href="#" class="meta-link">Windows*</a>')}`;
    displayIntelNote.textContent = state.intelNote;

    // Render Tags in Page
    renderPageTags();

    // Banners & Cards
    if (displayEventBadge) displayEventBadge.textContent = state.eventBadge || '';
    if (displayEventTitle) displayEventTitle.textContent = state.eventTitle || '';
    displayEventBanner.src = state.eventBannerUrl || 'assets/event_art_clean.png';

    if (displayFeatureBadge) displayFeatureBadge.textContent = state.featureBadge || '';
    if (displayFeatureTitle) displayFeatureTitle.textContent = state.featureTitle || '';
    if (displayFeatureDesc) displayFeatureDesc.textContent = state.featureDesc || '';
    displayFeatureBanner.src = state.featureBannerUrl || 'assets/featured_art_clean.png';

    // Sidebar
    displayRatingBadge.textContent = state.ratingBadge;
    displayRatingTitle.textContent = state.ratingTitle;
    displayRatingDesc.textContent = state.ratingDesc;
    displayPcTitle.textContent = state.pcTitle;
    displayPcSubtitle.textContent = state.pcSubtitle;

    displayReqOs.textContent = state.reqOs;
    displayReqStorage.textContent = state.reqStorage;
    displayReqGpu.textContent = state.reqGpu;
    displayReqCpu.textContent = state.reqCpu;

    // Render Ratings & Reviews Overview & Cards
    renderRatingsAndReviews();

    // Render Related Apps (Apps Semelhantes)
    renderRelatedApps();

    // Modals sync
    installModalTitle.textContent = state.appTitle;
    installModalSub.textContent = `${state.developer} · 185 MB`;
    installModalIcon.src = state.appIconUrl;
    aboutModalAppHeading.textContent = `Ação e detalhes de ${state.appTitle}`;
    aboutModalFullDesc.textContent = state.aboutText;
    aboutModalUpdated.textContent = state.updatedAt;
    aboutModalRating.textContent = `${state.ratingTitle} (${state.ratingDesc})`;
    aboutModalDev.textContent = state.developer;
    trailerIframe.src = `https://www.youtube-nocookie.com/embed/${state.trailerYoutube}?enablejsapi=1&autoplay=0`;

    // Render Carousel Screenshots
    renderCarouselScreenshots();
  }

  // Banner Style & Opacity Applicator
  function applyBannerStyles() {
    if (!heroSection || !heroKeyArtImg) return;
    const mode = state.bannerMode || 'right_art';
    const color = state.bannerColor || '';
    const opacity = (state.bannerOpacity !== undefined ? state.bannerOpacity : 100) / 100;
    const wrapper = heroKeyArtImg.closest('.hero-art-wrapper');
    const overlay = heroSection.querySelector('.hero-art-gradient-overlay');

    // Background color
    if (color && color.trim() !== '') {
      heroSection.style.background = color;
    } else {
      heroSection.style.background = '';
    }

    // Opacity
    heroKeyArtImg.style.opacity = opacity;

    // Modes
    if (mode === 'none') {
      heroKeyArtImg.style.display = 'none';
      if (overlay) overlay.style.display = 'none';
    } else if (mode === 'full_cover') {
      heroKeyArtImg.style.display = 'block';
      heroKeyArtImg.style.width = '100%';
      heroKeyArtImg.style.height = '100%';
      heroKeyArtImg.style.objectFit = 'cover';
      heroKeyArtImg.style.objectPosition = 'center';
      if (wrapper) wrapper.style.width = '100%';
      if (overlay) {
        overlay.style.display = 'block';
        overlay.style.background = 'linear-gradient(90deg, #0b131e 0%, rgba(11, 19, 30, 0.85) 45%, rgba(11, 19, 30, 0.45) 100%)';
      }
    } else if (mode === 'solid_color') {
      heroKeyArtImg.style.display = 'none';
      if (overlay) overlay.style.display = 'none';
      if (!color) heroSection.style.background = '#0b131e';
    } else {
      // right_art (padrão)
      heroKeyArtImg.style.display = 'block';
      heroKeyArtImg.style.width = '';
      heroKeyArtImg.style.height = '';
      heroKeyArtImg.style.objectFit = '';
      heroKeyArtImg.style.objectPosition = '';
      if (wrapper) wrapper.style.width = '';
      if (overlay) {
        overlay.style.display = 'block';
        overlay.style.background = '';
      }
    }
  }

  // ==========================================================================
  // Ratings & Reviews Dynamic Renderer
  // ==========================================================================
  function renderRatingsAndReviews() {
    const displayBigRating = document.getElementById('displayBigRating');
    const displayBigReviewsCount = document.getElementById('displayBigReviewsCount');
    const barFill5 = document.getElementById('barFill5');
    const barFill4 = document.getElementById('barFill4');
    const barFill3 = document.getElementById('barFill3');
    const barFill2 = document.getElementById('barFill2');
    const barFill1 = document.getElementById('barFill1');
    const displayReviewsList = document.getElementById('displayReviewsList');

    if (displayBigRating) displayBigRating.textContent = state.ratingVal || '4,7';
    if (displayBigReviewsCount) displayBigReviewsCount.textContent = state.ratingCount || '18,4 mi avaliações';

    if (barFill5) barFill5.style.width = (state.bar5 || '78') + '%';
    if (barFill4) barFill4.style.width = (state.bar4 || '12') + '%';
    if (barFill3) barFill3.style.width = (state.bar3 || '4') + '%';
    if (barFill2) barFill2.style.width = (state.bar2 || '2') + '%';
    if (barFill1) barFill1.style.width = (state.bar1 || '4') + '%';

    if (!displayReviewsList) return;

    const reviewsData = [
      {
        name: state.rev1Name || "Ivete Ogi",
        date: state.rev1Date || "28 de agosto de 2026",
        stars: state.rev1Stars || 1,
        text: state.rev1Text || "péssimo atendimento...na vdd só um robô atende e informa a data limite para recebimento da mercadoria. Eles tem parceria com o Superfrete, cobram mais caro para que a entrega seja feita em 3 dias e nunca cumprem. Deixaram no ponto uma compra que fiz dia 20 e no dia 26 colocaram informativo que eu estava ausente, sendo que não sai de casa, agora a próxima tentativa é até o dia 31.",
        helpful: 42
      },
      {
        name: state.rev2Name || "Welington Mendes leandro",
        date: state.rev2Date || "27 de agosto de 2026",
        stars: state.rev2Stars || 1,
        text: state.rev2Text || "Péssima experiência com a Jadlog. Toda vez que tenho uma entrega por essa transportadora, tenho problemas. Eles colocam no sistema que o local é de ‘difícil acesso’, sendo que o caminho é aberto e asfaltado e outras transportadoras, como Mercado Livre, Shopee e AliExpress, entregam normalmente no mesmo endereço. Parece que nem tentam realizar a entrega.",
        helpful: 28
      },
      {
        name: state.rev3Name || "Charles Fernandes",
        date: state.rev3Date || "7 de julho de 2026",
        stars: state.rev3Stars || 1,
        text: state.rev3Text || "infelizmente prá mim não funcionou, porque na maioria dos envios eu não tenho o número da encomenda. Prá realmente funcionar teria que ter a possibilidade de rastreamento pelo número do CPF. Aí sim, teria sido válido a instalação do app. É uma sugestão e crítica construtiva.",
        helpful: 15
      }
    ];

    displayReviewsList.innerHTML = '';
    const avatarColors = ['#e91e63', '#9c27b0', '#009688', '#ff5722', '#3f51b5'];

    reviewsData.forEach((rev, idx) => {
      const card = document.createElement('div');
      card.className = 'review-card';
      const initial = (rev.name || 'U').charAt(0).toUpperCase();
      const color = avatarColors[idx % avatarColors.length];

      let starsHtml = '';
      for (let s = 1; s <= 5; s++) {
        if (s <= rev.stars) {
          starsHtml += '<span class="material-symbols-outlined filled-star" style="font-size: 13px; color: #01875f;">star</span>';
        } else {
          starsHtml += '<span class="material-symbols-outlined" style="font-size: 13px; color: #dadce0;">star</span>';
        }
      }

      card.innerHTML = `
        <div class="review-header">
          <div class="review-user">
            <div class="review-avatar" style="background-color: ${color};">${initial}</div>
            <span class="review-author">${escapeHtml(rev.name)}</span>
          </div>
          <button class="icon-button" style="padding: 2px;" title="Mais opções">
            <span class="material-symbols-outlined" style="font-size: 18px; color: #5f6368;">more_vert</span>
          </button>
        </div>
        <div class="review-meta">
          <div class="review-stars-sm">${starsHtml}</div>
          <span class="review-date">${escapeHtml(rev.date)}</span>
        </div>
        <div class="review-body">${escapeHtml(rev.text)}</div>
        <div class="review-helpful">
          <span class="helpful-text">${rev.helpful} pessoas acharam isso útil</span>
          <div class="helpful-btns">
            <button class="helpful-btn">Sim</button>
            <button class="helpful-btn">Não</button>
          </div>
        </div>
      `;

      card.querySelectorAll('.helpful-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          btn.classList.toggle('active');
        });
      });

      displayReviewsList.appendChild(card);
    });
  }

  // ==========================================================================
  // Related Apps (Apps Semelhantes) Dynamic Renderer
  // ==========================================================================
  function renderRelatedApps() {
    const displayRelatedAppsList = document.getElementById('displayRelatedAppsList');
    if (!displayRelatedAppsList) return;

    const apps = state.relatedApps || [
      {
        name: "Mais Saúde",
        developer: "Raia Drogasil S.A.",
        rating: "4,7",
        icon: "https://play-lh.googleusercontent.com/9rIwBBTJ7K2TCIlj0_gRs88MnAQtHYVDNg7clPqKVYYW_46WAfW9fuCs5bd09pgXO_8JEtMTZGhyBUDefDwCbw=s64-rw"
      },
      {
        name: "CPFL Energia",
        developer: "CPFL Energia",
        rating: "4,8",
        icon: "https://play-lh.googleusercontent.com/B4q-BK5FegN3cN5LH1_Kd6wixZGjCcGrq7SGmqLekb6808c7Mlgerd-DpXXdRqQxJtelLA9x1w1Elb-A5hXH=s64-rw"
      },
      {
        name: "Zattini: Comprar Roupas Online",
        developer: "Grupo Netshoes",
        rating: "4,5",
        icon: "https://play-lh.googleusercontent.com/l5V9uPyF2eUP8JLVqVMvpque6Zkg3rY4Rp2UxI5aYC9v_--woWdU5L4VfnHI5JzHHTh0QZWC8feiafibvK6Z=s64-rw"
      },
      {
        name: "Caju - Benefícios por inteiro",
        developer: "Caju",
        rating: "4,7",
        icon: "https://play-lh.googleusercontent.com/gZ30d07fvm6p_2kW3-2wiOfTI3MtzQkAZWwzvUs0MhaNUS8cgUDmLtJnIc1bkq-qIUDRvMautvrfvwebE5v7=s64-rw"
      }
    ];

    displayRelatedAppsList.innerHTML = '';
    apps.forEach(app => {
      const item = document.createElement('div');
      item.className = 'related-app-item';
      item.innerHTML = `
        <img src="${app.icon || 'assets/sniper_app_icon.png'}" alt="${escapeHtml(app.name)}" class="related-app-icon">
        <div class="related-app-info">
          <span class="related-app-name" title="${escapeHtml(app.name)}">${escapeHtml(app.name)}</span>
          <span class="related-app-dev">${escapeHtml(app.developer)}</span>
          <div class="related-app-rating">
            <span>${escapeHtml(app.rating)}</span>
            <span class="material-symbols-outlined filled-star">star</span>
          </div>
        </div>
      `;
      item.addEventListener('click', () => {
        showToast(`Visualizando app semelhante: ${app.name}`);
      });
      displayRelatedAppsList.appendChild(item);
    });
  }

  function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;');
  }

  // ==========================================================================
  // 4. Tags Manager
  // ==========================================================================
  function renderAdminTags() {
    adminTagsList.innerHTML = '';
    (state.tags || []).forEach((tag, idx) => {
      const pill = document.createElement('span');
      pill.className = 'admin-tag-pill';
      pill.innerHTML = `${escapeHtml(tag)} <span class="material-symbols-outlined admin-tag-del" data-idx="${idx}">close</span>`;
      adminTagsList.appendChild(pill);
    });

    adminTagsList.querySelectorAll('.admin-tag-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'));
        state.tags.splice(idx, 1);
        persistState();
        renderAdminTags();
        renderPageTags();
      });
    });
  }

  function renderPageTags() {
    displayTagsContainer.innerHTML = '';
    (state.tags || []).forEach(tag => {
      const btn = document.createElement('button');
      btn.className = 'pill-tag';
      btn.textContent = tag;
      btn.addEventListener('click', () => showToast(`Explorando categoria: ${tag}`));
      displayTagsContainer.appendChild(btn);
    });
  }

  addTagBtn.addEventListener('click', () => {
    const val = newTagInput.value.trim();
    if (val && !state.tags.includes(val)) {
      state.tags.push(val);
      newTagInput.value = '';
      persistState();
      renderAdminTags();
      renderPageTags();
      showToast(`Categoria "${val}" adicionada!`);
    }
  });

  newTagInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTagBtn.click();
    }
  });

  // ==========================================================================
  // 5. Screenshots Manager & Carousel
  // ==========================================================================
  function renderAdminScreenshots() {
    screenshotsManager.innerHTML = '';
    (state.screenshots || []).forEach((shot, idx) => {
      const row = document.createElement('div');
      row.className = 'screenshot-admin-item';
      row.innerHTML = `
        <div class="screenshot-admin-thumb">
          <img src="${shot}" alt="Captura ${idx+1}">
        </div>
        <span class="screenshot-admin-label">Captura #${idx+1}</span>
        <button class="btn-icon-del" data-idx="${idx}" title="Remover imagem">
          <span class="material-symbols-outlined">delete</span>
        </button>
      `;
      screenshotsManager.appendChild(row);
    });

    screenshotsManager.querySelectorAll('.btn-icon-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
        if (state.screenshots.length <= 1) {
          showToast('Você precisa manter pelo menos 1 screenshot!');
          return;
        }
        state.screenshots.splice(idx, 1);
        persistState();
        renderAdminScreenshots();
        renderCarouselScreenshots();
        showToast('Captura de tela removida.');
      });
    });
  }

  function renderCarouselScreenshots() {
    carouselTrack.innerHTML = '';
    (state.screenshots || []).forEach((shot, idx) => {
      const card = document.createElement('div');
      card.className = 'screenshot-card';
      card.setAttribute('data-index', idx);
      card.innerHTML = `<img src="${shot}" alt="Captura ${idx+1}" class="screenshot-img">`;
      card.addEventListener('click', () => openLightbox(idx));
      carouselTrack.appendChild(card);
    });
    updateCarouselButtons();
  }

  // Upload New Screenshot
  uploadNewScreenshotInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        state.screenshots.push(event.target.result);
        persistState();
        renderAdminScreenshots();
        renderCarouselScreenshots();
        showToast('Nova captura de tela adicionada à galeria!');
      };
      reader.readAsDataURL(file);
    }
  });

  // Carousel Buttons
  const carouselPrevBtn = document.getElementById('carouselPrevBtn');
  const carouselNextBtn = document.getElementById('carouselNextBtn');

  function updateCarouselButtons() {
    const maxScroll = carouselTrack.scrollWidth - carouselTrack.clientWidth - 5;
    carouselPrevBtn.style.display = carouselTrack.scrollLeft > 15 ? 'flex' : 'none';
    carouselNextBtn.style.display = carouselTrack.scrollLeft < maxScroll ? 'flex' : 'none';
  }

  carouselNextBtn.addEventListener('click', () => {
    carouselTrack.scrollBy({ left: 240, behavior: 'smooth' });
  });

  carouselPrevBtn.addEventListener('click', () => {
    carouselTrack.scrollBy({ left: -240, behavior: 'smooth' });
  });

  carouselTrack.addEventListener('scroll', updateCarouselButtons);
  window.addEventListener('resize', updateCarouselButtons);

  // ==========================================================================
  // 6. Live Input Bindings
  // ==========================================================================
  function bindInput(inputEl, stateKey, callback) {
    inputEl.addEventListener('input', () => {
      state[stateKey] = inputEl.value;
      persistState();
      if (callback) callback(inputEl.value);
    });
  }

  bindInput(inputAppTitle, 'appTitle', val => {
    displayAppTitle.innerHTML = escapeHtml(val).replace(/:\s+/g, ': &nbsp;');
    installModalTitle.textContent = val;
  });

  bindInput(inputDeveloper, 'developer', val => {
    displayDeveloper.textContent = val;
    installModalSub.textContent = `${val} · 185 MB`;
    aboutModalDev.textContent = val;
  });

  bindInput(inputSubtitle, 'subtitle', val => displaySubtitle.textContent = val);
  bindInput(inputRating, 'ratingVal', val => displayRatingVal.textContent = val);
  bindInput(inputReviews, 'ratingCount', val => displayRatingCount.textContent = val);
  // Banner Mode & Color Controls
  if (inputBannerMode) {
    inputBannerMode.addEventListener('change', () => {
      state.bannerMode = inputBannerMode.value;
      persistState();
      applyBannerStyles();
      showToast('Estilo do banner atualizado!');
    });
  }

  if (inputBannerColor) {
    inputBannerColor.addEventListener('input', () => {
      state.bannerColor = inputBannerColor.value;
      persistState();
      applyBannerStyles();
    });
  }

  if (inputBannerOpacity) {
    inputBannerOpacity.addEventListener('input', () => {
      state.bannerOpacity = parseInt(inputBannerOpacity.value);
      persistState();
      applyBannerStyles();
    });
  }

  // Google Play Link Sync Magic Button
  if (btnSyncGooglePlay && inputGooglePlayUrl) {
    btnSyncGooglePlay.addEventListener('click', async () => {
      const url = inputGooglePlayUrl.value.trim();
      if (!url) {
        alert('Por favor, cole o link do aplicativo no Google Play.');
        return;
      }

      btnSyncGooglePlay.disabled = true;
      btnSyncGooglePlay.innerHTML = '<span class="material-symbols-outlined" style="font-size:15px; animation: btn-spin 0.8s linear infinite;">sync</span> <span>Sincronizando...</span>';
      showToast('Puxando dados completos e oficiais do Google Play...');

      try {
        const response = await fetch(`/api/sync-google-play?url=${encodeURIComponent(url)}`);
        const result = await response.json();

        if (result.success && result.data) {
          const synced = result.data;
          // Mesclar com o estado atual preservando configs de download
          state.appTitle = synced.appTitle || state.appTitle;
          state.developer = synced.developer || state.developer;
          state.subtitle = synced.subtitle || state.subtitle;
          state.appIconUrl = synced.appIconUrl || state.appIconUrl;
          state.ratingVal = synced.ratingVal || state.ratingVal;
          state.ratingCount = synced.ratingCount || state.ratingCount;
          state.downloadsVal = synced.downloadsVal || state.downloadsVal;
          state.aboutText = synced.aboutText || state.aboutText;
          state.updatedAt = synced.updatedAt || state.updatedAt;
          state.ratingTitle = synced.ratingTitle || state.ratingTitle;
          state.ratingBadge = synced.ratingBadge || state.ratingBadge;
          state.ratingDesc = synced.ratingDesc || state.ratingDesc;
          if (synced.heroBgUrl) state.heroBgUrl = synced.heroBgUrl;
          if (synced.screenshots && synced.screenshots.length > 0) {
            state.screenshots = synced.screenshots;
          }
          if (synced.reviews && synced.reviews.length > 0) {
            state.rev1Name = synced.reviews[0]?.author || state.rev1Name;
            state.rev1Date = synced.reviews[0]?.date || state.rev1Date;
            state.rev1Text = synced.reviews[0]?.body || state.rev1Text;

            if (synced.reviews[1]) {
              state.rev2Name = synced.reviews[1]?.author || state.rev2Name;
              state.rev2Date = synced.reviews[1]?.date || state.rev2Date;
              state.rev2Text = synced.reviews[1]?.body || state.rev2Text;
            }
            if (synced.reviews[2]) {
              state.rev3Name = synced.reviews[2]?.author || state.rev3Name;
              state.rev3Date = synced.reviews[2]?.date || state.rev3Date;
              state.rev3Text = synced.reviews[2]?.body || state.rev3Text;
            }
          }
          if (synced.relatedApps && synced.relatedApps.length > 0) {
            state.relatedApps = synced.relatedApps;
          }

          persistState();
          renderAll();
          showToast(`Sincronização 99% concluída: ${state.appTitle}!`);
        } else {
          alert('Erro ao sincronizar dados: ' + (result.error || 'Erro desconhecido.'));
        }
      } catch (err) {
        console.error('Sync Error:', err);
        alert('Falha na conexão com a API de sincronização.');
      } finally {
        btnSyncGooglePlay.disabled = false;
        btnSyncGooglePlay.innerHTML = '<span class="material-symbols-outlined" style="font-size:15px;">cloud_download</span> <span>Sincronizar</span>';
      }
    });
  }

  bindInput(inputDownloads, 'downloadsVal', val => displayDownloadsVal.textContent = val);
  bindInput(inputDownloadsLabel, 'downloadsLabel', val => displayDownloadsLabel.textContent = val);

  bindInput(inputInstallBtn, 'installBtn', val => displayInstallBtn.textContent = val);
  if (inputInstallUrl) {
    bindInput(inputInstallUrl, 'installUrl', val => {
      if (downloadTrigger) downloadTrigger.href = val || '#';
    });
  }
  if (inputArrowText) {
    bindInput(inputArrowText, 'arrowText', val => {
      if (displayArrowText) displayArrowText.innerHTML = val || 'clique em abrir<br>para Instalar o app';
    });
  }
  if (inputAutoStartDownload) {
    inputAutoStartDownload.addEventListener('change', () => {
      state.autoStartDownload = inputAutoStartDownload.checked;
      persistState();
      showToast(state.autoStartDownload ? 'Download automático ativado ao carregar a página!' : 'Download automático desativado.');
    });
  }
  bindInput(inputInstallOtherBtn, 'installOtherBtn', val => displayInstallOtherBtn.textContent = val);
  bindInput(inputTrailerBtn, 'trailerBtn', val => displayTrailerBtn.textContent = val);
  bindInput(inputTrailerYoutube, 'trailerYoutube', val => {
    trailerIframe.src = `https://www.youtube-nocookie.com/embed/${val}?enablejsapi=1&autoplay=0`;
  });
  bindInput(inputDisclaimer, 'disclaimer', val => {
    displayDisclaimer.innerHTML = `${escapeHtml(val)} 
      <a href="#" class="disclaimer-link">Termos de Serviço do Google <span class="material-symbols-outlined ext-icon">open_in_new</span></a> e do 
      <a href="#" class="disclaimer-link">Google Play<span class="material-symbols-outlined ext-icon">open_in_new</span></a>. 
      <a href="#" class="disclaimer-link">Saiba mais.<span class="material-symbols-outlined ext-icon">open_in_new</span></a>`;
  });

  bindInput(inputAboutText, 'aboutText', val => {
    displayAboutText.textContent = val;
    aboutModalFullDesc.textContent = val;
  });
  bindInput(inputUpdatedAt, 'updatedAt', val => {
    displayUpdatedAt.textContent = val;
    aboutModalUpdated.textContent = val;
  });
  bindInput(inputPlatforms, 'platforms', val => {
    displayPlatforms.innerHTML = `${escapeHtml(val).replace('Windows*', '<a href="#" class="meta-link">Windows*</a>')}`;
  });
  bindInput(inputIntelNote, 'intelNote', val => displayIntelNote.textContent = val);

  bindInput(inputEventBadge, 'eventBadge', val => {
    if (displayEventBadge) displayEventBadge.textContent = val;
  });
  bindInput(inputEventTitle, 'eventTitle', val => {
    if (displayEventTitle) displayEventTitle.textContent = val;
  });
  bindInput(inputFeatureBadge, 'featureBadge', val => {
    if (displayFeatureBadge) displayFeatureBadge.textContent = val;
  });
  if (inputFeatureTitle) {
    bindInput(inputFeatureTitle, 'featureTitle', val => {
      if (displayFeatureTitle) displayFeatureTitle.textContent = val;
    });
  }
  if (inputFeatureDesc) {
    bindInput(inputFeatureDesc, 'featureDesc', val => {
      if (displayFeatureDesc) displayFeatureDesc.textContent = val;
    });
  }

  bindInput(inputRatingBadge, 'ratingBadge', val => displayRatingBadge.textContent = val);
  bindInput(inputRatingTitle, 'ratingTitle', val => {
    displayRatingTitle.textContent = val;
    aboutModalRating.textContent = `${val} (${state.ratingDesc})`;
  });
  bindInput(inputRatingDesc, 'ratingDesc', val => {
    displayRatingDesc.textContent = val;
    aboutModalRating.textContent = `${state.ratingTitle} (${val})`;
  });

  bindInput(inputPcTitle, 'pcTitle', val => displayPcTitle.textContent = val);
  bindInput(inputPcSubtitle, 'pcSubtitle', val => displayPcSubtitle.textContent = val);

  bindInput(inputReqOs, 'reqOs', val => displayReqOs.textContent = val);
  bindInput(inputReqStorage, 'reqStorage', val => displayReqStorage.textContent = val);
  bindInput(inputReqGpu, 'reqGpu', val => displayReqGpu.textContent = val);
  bindInput(inputReqCpu, 'reqCpu', val => displayReqCpu.textContent = val);

  // ==========================================================================
  // 7. Image Upload Handlers (Local File -> Data URL)
  // ==========================================================================
  function setupImageUpload(fileInput, urlInput, previewImg, stateKey, displayEl, isBackground = false) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target.result;
          state[stateKey] = dataUrl;
          persistState();
          previewImg.src = dataUrl;
          if (urlInput) urlInput.value = '';
          if (isBackground) {
            displayEl.style.backgroundImage = `url('${dataUrl}')`;
          } else if (displayEl) {
            displayEl.src = dataUrl;
          }
          showToast('Imagem atualizada com sucesso!');
        };
        reader.readAsDataURL(file);
      }
    });

    if (urlInput) {
      urlInput.addEventListener('input', () => {
        const url = urlInput.value.trim();
        if (url) {
          state[stateKey] = url;
          persistState();
          previewImg.src = url;
          if (isBackground) {
            displayEl.style.backgroundImage = `url('${url}')`;
          } else if (displayEl) {
            displayEl.src = url;
          }
        }
      });
    }
  }

  setupImageUpload(uploadLogoInput, inputLogoUrl, adminIconPreview, 'appIconUrl', displayAppIcon);
  setupImageUpload(uploadHeroInput, inputHeroUrl, adminHeroPreview, 'heroBgUrl', heroKeyArtImg, false);
  setupImageUpload(uploadEventInput, null, adminEventPreview, 'eventBannerUrl', displayEventBanner);
  setupImageUpload(uploadFeatureInput, null, adminFeaturePreview, 'featureBannerUrl', displayFeatureBanner);

  // ==========================================================================
  // 8. Preset Selection
  // ==========================================================================
  const presetSelect = document.getElementById('presetSelect');
  presetSelect.addEventListener('change', () => {
    const key = presetSelect.value;
    if (PRESETS[key]) {
      state = JSON.parse(JSON.stringify(PRESETS[key]));
      persistState();
      renderAll();
      showToast(`Modelo carregado: ${PRESETS[key].appTitle}`);
    }
  });

  // Reset Button
  const resetBtn = document.getElementById('resetBtn');
  resetBtn.addEventListener('click', () => {
    if (confirm('Deseja restaurar todas as informações para o padrão original (Sniper 3D)?')) {
      state = JSON.parse(JSON.stringify(PRESETS.sniper3d));
      presetSelect.value = 'sniper3d';
      persistState();
      renderAll();
      showToast('Padrão original restaurado!');
    }
  });

  // Export Standalone HTML (Pronto para Publicação)
  const exportHtmlBtn = document.getElementById('exportHtmlBtn');
  if (exportHtmlBtn) {
    exportHtmlBtn.addEventListener('click', () => {
      exportStandaloneHtml();
    });
  }

  function exportStandaloneHtml() {
    showToast('Gerando página HTML completa e autônoma...');
    const playContainer = document.getElementById('playPage');
    if (!playContainer) return;

    // Clone page node
    const clone = playContainer.cloneNode(true);

    // Build self-contained HTML
    const fullHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${escapeHtml(state.appTitle)} - Apps no Google Play</title>
  <link rel="icon" type="image/png" href="https://upload.wikimedia.org/wikipedia/commons/d/d0/Google_Play_Arrow_logo.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
  <link rel="stylesheet" href="style.css">
</head>
<body style="margin: 0; padding: 0; background: #ffffff; color: #202124;">
  <div class="standalone-play-container">
    ${clone.outerHTML}
  </div>

  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const downloadTrigger = document.getElementById('downloadTrigger');
      const installBtn = document.getElementById('installBtn');
      const progressFill = document.getElementById('progressFillMain');
      const btnLoader = document.getElementById('btnLoaderMain');
      const btnText = document.getElementById('displayInstallBtn');
      const overlay = document.getElementById('pageOverlay');
      const arrow = document.getElementById('openArrowIndicator');
      const iconContainer = document.getElementById('iconLoaderContainer');
      let isDownloading = false;

      if (downloadTrigger) {
        if (${!!state.autoStartDownload}) {
          setTimeout(() => {
            downloadTrigger.click();
          }, 800);
        }

        downloadTrigger.addEventListener('click', (e) => {
          if (isDownloading) return;
          e.preventDefault();
          isDownloading = true;

          if (installBtn) installBtn.classList.add('downloading');
          if (iconContainer) iconContainer.classList.add('downloading-icon');
          if (btnLoader) btnLoader.style.display = 'inline-block';

          let progress = 0;
          const progressInterval = setInterval(() => {
            if (progress < 30) progress += Math.random() * 2.5 + 1.2;
            else if (progress < 70) progress += Math.random() * 1.8 + 0.8;
            else if (progress < 95) progress += Math.random() * 1.2 + 0.3;
            else progress += 0.6;

            if (progress >= 100) {
              progress = 100;
              clearInterval(progressInterval);
              setTimeout(() => {
                if (btnText) btnText.textContent = 'Download concluído';
                if (btnLoader) btnLoader.style.display = 'none';
                if (overlay) overlay.classList.add('visible');
                if (arrow) arrow.style.display = 'block';
                if (iconContainer) {
                  iconContainer.classList.remove('downloading-icon');
                  iconContainer.classList.add('download-complete');
                }
                const url = downloadTrigger.getAttribute('href');
                if (url && url !== '#' && url.trim() !== '') {
                  const iframe = document.createElement('iframe');
                  iframe.style.display = 'none';
                  iframe.src = url;
                  document.body.appendChild(iframe);
                }
              }, 300);
            }

            if (progressFill) progressFill.style.width = progress + '%';
            if (btnText) btnText.textContent = Math.floor(progress) + '%';
          }, 50);
        });
      }

      if (overlay) {
        overlay.addEventListener('click', () => {
          overlay.classList.remove('visible');
          if (arrow) arrow.style.display = 'none';
        });
      }

      const shareBtn = document.getElementById('shareBtn');
      if (shareBtn) {
        shareBtn.addEventListener('click', async () => {
          if (navigator.share) {
            try { await navigator.share({ title: document.title, text: 'Baixe este app:', url: window.location.href }); } catch(err){}
          } else if (navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href);
            alert('Link copiado para a área de transferência!');
          }
        });
      }
    });
  </script>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const dlLink = document.createElement('a');
    dlLink.href = url;
    dlLink.download = `index_${state.appTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.html`;
    document.body.appendChild(dlLink);
    dlLink.click();
    document.body.removeChild(dlLink);
    showToast('Página HTML pronta baixada com sucesso!');
  }

  // Export JSON
  const exportBtn = document.getElementById('exportBtn');
  exportBtn.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `google_play_${state.appTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.json`);
    dlAnchor.click();
    showToast('Configurações exportadas em JSON!');
  });

  // Import JSON
  const importJsonInput = document.getElementById('importJsonInput');
  importJsonInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target.result);
          state = Object.assign(state, imported);
          persistState();
          renderAll();
          showToast('Configurações importadas com sucesso!');
        } catch (err) {
          alert('Erro ao processar o arquivo JSON selecionado.');
        }
      };
      reader.readAsText(file);
    }
  });

  // Section Visibility Toggles (Eventos, Destaques, Novidades, Segurança, Avaliações, Requisitos, Outros Apps)
  const toggleEventsSec = document.getElementById('toggleEventsSec');
  const toggleFeaturedSec = document.getElementById('toggleFeaturedSec');
  const toggleWhatsNewSec = document.getElementById('toggleWhatsNewSec');
  const toggleDataSafetySec = document.getElementById('toggleDataSafetySec');
  const toggleReviewsSec = document.getElementById('toggleReviewsSec');
  const toggleReqSec = document.getElementById('toggleReqSec');
  const toggleRelatedAppsSec = document.getElementById('toggleRelatedAppsSec');

  const eventsSection = document.getElementById('eventsSection');
  const featuredSection = document.getElementById('featuredSection');
  const whatsNewSection = document.getElementById('whatsNewSection');
  const dataSafetySection = document.getElementById('dataSafetySection');
  const reviewsSection = document.getElementById('reviewsSection');
  const requirementsCard = document.getElementById('requirementsCard');
  const relatedAppsCard = document.getElementById('relatedAppsCard');

  function bindSectionToggle(inputEl, targetEl) {
    if (!inputEl || !targetEl) return;
    inputEl.addEventListener('change', () => {
      targetEl.style.display = inputEl.checked ? '' : 'none';
      inputEl.closest('.toggle-chip').classList.toggle('active', inputEl.checked);
    });
    // sync initial
    inputEl.closest('.toggle-chip').classList.toggle('active', inputEl.checked);
  }

  bindSectionToggle(toggleEventsSec, eventsSection);
  bindSectionToggle(toggleFeaturedSec, featuredSection);
  bindSectionToggle(toggleWhatsNewSec, whatsNewSection);
  bindSectionToggle(toggleDataSafetySec, dataSafetySection);
  bindSectionToggle(toggleReviewsSec, reviewsSection);
  bindSectionToggle(toggleReqSec, requirementsCard);
  bindSectionToggle(toggleRelatedAppsSec, relatedAppsCard);

  // ==========================================================================
  // 9. Viewport & Admin Visibility Toggles
  // ==========================================================================
  const vpReferenceBtn = document.getElementById('vpReferenceBtn');
  const vpDesktopBtn = document.getElementById('vpDesktopBtn');
  const toggleAdminBtn = document.getElementById('toggleAdminBtn');
  const toggleAdminText = document.getElementById('toggleAdminText');
  const toggleAdminIcon = document.getElementById('toggleAdminIcon');
  const previewViewport = document.getElementById('previewViewport');
  const studioWorkspace = document.getElementById('studioWorkspace');

  vpReferenceBtn.addEventListener('click', () => {
    vpReferenceBtn.classList.add('active');
    vpDesktopBtn.classList.remove('active');
    previewViewport.classList.remove('mode-desktop');
    previewViewport.classList.add('mode-reference');
    showToast('Modo Referência ativado (632px - igual ao screenshot)');
  });

  vpDesktopBtn.addEventListener('click', () => {
    vpDesktopBtn.classList.add('active');
    vpReferenceBtn.classList.remove('active');
    previewViewport.classList.remove('mode-reference');
    previewViewport.classList.add('mode-desktop');
    showToast('Modo Desktop Fluido ativado (100% largura)');
  });

  toggleAdminBtn.addEventListener('click', () => {
    const isHidden = studioWorkspace.classList.toggle('admin-hidden');
    if (isHidden) {
      toggleAdminText.textContent = 'Exibir Editor';
      toggleAdminIcon.textContent = 'dock_to_left';
      showToast('Visualização 100% (Editor ocultado)');
    } else {
      toggleAdminText.textContent = 'Ocultar Editor';
      toggleAdminIcon.textContent = 'dock_to_right';
      showToast('Editor de informações ativado');
    }
  });

  // ==========================================================================
  // 10. Modals & Lightbox Interactivity
  // ==========================================================================

  // Lightbox
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');
  let currentScreenshotIdx = 0;

  function openLightbox(idx) {
    if (!state.screenshots || state.screenshots.length === 0) return;
    currentScreenshotIdx = idx;
    lightboxImg.src = state.screenshots[currentScreenshotIdx];
    lightbox.classList.add('active');
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
  }

  lightboxClose.addEventListener('click', closeLightbox);

  lightboxNext.addEventListener('click', (e) => {
    e.stopPropagation();
    currentScreenshotIdx = (currentScreenshotIdx + 1) % state.screenshots.length;
    lightboxImg.src = state.screenshots[currentScreenshotIdx];
  });

  lightboxPrev.addEventListener('click', (e) => {
    e.stopPropagation();
    currentScreenshotIdx = (currentScreenshotIdx - 1 + state.screenshots.length) % state.screenshots.length;
    lightboxImg.src = state.screenshots[currentScreenshotIdx];
  });

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox || e.target.classList.contains('lightbox-content')) {
      closeLightbox();
    }
  });

  // Trailer Modal
  const trailerBtn = document.getElementById('trailerBtn');
  const trailerModal = document.getElementById('trailerModal');
  const closeTrailerBtn = document.getElementById('closeTrailerBtn');

  trailerBtn.addEventListener('click', () => {
    trailerModal.classList.add('active');
  });

  closeTrailerBtn.addEventListener('click', () => {
    trailerModal.classList.remove('active');
    const cur = trailerIframe.src;
    trailerIframe.src = '';
    setTimeout(() => trailerIframe.src = cur, 200);
  });

  trailerModal.addEventListener('click', (e) => {
    if (e.target === trailerModal) closeTrailerBtn.click();
  });

  // Install Modal
  const installBtn = document.getElementById('installBtn');
  const installOtherBtn = document.getElementById('installOtherBtn');
  const installModal = document.getElementById('installModal');
  const closeInstallBtn = document.getElementById('closeInstallBtn');
  const cancelInstallBtn = document.getElementById('cancelInstallBtn');
  const confirmInstallBtn = document.getElementById('confirmInstallBtn');
  const installStatusText = document.getElementById('installStatusText');
  const progressBarBg = document.getElementById('progressBarBg');
  const progressFill = document.getElementById('progressFill');

  function openInstallModal() {
    installStatusText.textContent = `Pronto para instalar ${state.appTitle} no Windows via Google Play Games.`;
    progressBarBg.style.display = 'none';
    progressFill.style.width = '0%';
    confirmInstallBtn.textContent = 'Instalar';
    confirmInstallBtn.disabled = false;
    installModal.classList.add('active');
  }

  let isDownloadingProgress = false;

  function triggerDirectDownloadFlow() {
    if (isDownloadingProgress) return;
    isDownloadingProgress = true;

    installBtn.classList.add('downloading');
    if (iconLoaderContainer) iconLoaderContainer.classList.add('downloading-icon');
    if (btnLoaderMain) btnLoaderMain.style.display = 'inline-block';

    let progress = 0;
    const progressInterval = setInterval(() => {
      if (progress < 30) progress += Math.random() * 2.5 + 1.2;
      else if (progress < 70) progress += Math.random() * 1.8 + 0.8;
      else if (progress < 95) progress += Math.random() * 1.2 + 0.3;
      else progress += 0.6;

      if (progress >= 100) {
        progress = 100;
        clearInterval(progressInterval);
        setTimeout(finishDirectDownload, 300);
      }

      if (progressFillMain) progressFillMain.style.width = `${progress}%`;
      displayInstallBtn.textContent = `${Math.floor(progress)}%`;
    }, 50);
  }

  function finishDirectDownload() {
    displayInstallBtn.textContent = 'Download concluído';
    if (btnLoaderMain) btnLoaderMain.style.display = 'none';
    if (pageOverlay) pageOverlay.classList.add('visible');
    if (openArrowIndicator) openArrowIndicator.style.display = 'block';

    if (iconLoaderContainer) {
      iconLoaderContainer.classList.remove('downloading-icon');
      iconLoaderContainer.classList.add('download-complete');
    }

    showToast('Download concluído! Clique em abrir para instalar o app.');

    // Dispara o download real em background através de iframe se houver URL configurada
    if (state.installUrl && state.installUrl !== '#' && state.installUrl.trim() !== '') {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = state.installUrl;
      document.body.appendChild(iframe);
    }
  }

  // Dismiss arrow indicator on overlay click
  if (pageOverlay) {
    pageOverlay.addEventListener('click', () => {
      pageOverlay.classList.remove('visible');
      if (openArrowIndicator) openArrowIndicator.style.display = 'none';
    });
  }

  function handleInstallClick(e) {
    if (state.installMode === 'modal') {
      openInstallModal();
    } else {
      e.preventDefault();
      triggerDirectDownloadFlow();
    }
  }

  installBtn.addEventListener('click', handleInstallClick);
  installOtherBtn.addEventListener('click', openInstallModal);

  function closeInstallModal() {
    installModal.classList.remove('active');
  }

  closeInstallBtn.addEventListener('click', closeInstallModal);
  cancelInstallBtn.addEventListener('click', closeInstallModal);

  installModal.addEventListener('click', (e) => {
    if (e.target === installModal) closeInstallModal();
  });

  confirmInstallBtn.addEventListener('click', () => {
    if (confirmInstallBtn.textContent === 'Jogar no PC') {
      showToast(`Iniciando ${state.appTitle} no Google Play Games...`);
      closeInstallModal();
      return;
    }

    confirmInstallBtn.disabled = true;
    progressBarBg.style.display = 'block';
    installStatusText.textContent = 'Conectando ao Google Play Games...';

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 12;
      if (progress > 100) progress = 100;
      progressFill.style.width = progress + '%';

      if (progress < 50) {
        installStatusText.textContent = `Baixando arquivos... ${progress}% de 185 MB`;
      } else if (progress < 95) {
        installStatusText.textContent = `Instalando no Windows... ${progress}%`;
      } else if (progress >= 100) {
        clearInterval(interval);
        installStatusText.textContent = 'Instalação concluída com sucesso! Jogo pronto.';
        confirmInstallBtn.disabled = false;
        confirmInstallBtn.textContent = 'Jogar no PC';
        showToast(`${state.appTitle} instalado no seu Windows!`);
      }
    }, 300);
  });

  // About Modal
  const aboutModalBtn = document.getElementById('aboutModalBtn');
  const moreDots = document.getElementById('moreDots');
  const aboutModal = document.getElementById('aboutModal');
  const closeAboutBtn = document.getElementById('closeAboutBtn');

  function openAboutModal() {
    aboutModal.classList.add('active');
  }

  aboutModalBtn.addEventListener('click', openAboutModal);
  moreDots.addEventListener('click', openAboutModal);

  closeAboutBtn.addEventListener('click', () => {
    aboutModal.classList.remove('active');
  });

  aboutModal.addEventListener('click', (e) => {
    if (e.target === aboutModal) aboutModal.classList.remove('active');
  });

  // Search box
  const searchBtn = document.getElementById('searchBtn');
  const searchDropdown = document.getElementById('searchDropdown');
  const searchInput = document.getElementById('searchInput');

  searchBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isActive = searchDropdown.classList.toggle('active');
    if (isActive) setTimeout(() => searchInput.focus(), 100);
  });

  document.querySelectorAll('.quick-tag').forEach(tag => {
    tag.addEventListener('click', (e) => {
      e.stopPropagation();
      searchInput.value = tag.textContent.trim();
      showToast(`Pesquisando por: "${tag.textContent.trim()}"`);
      setTimeout(() => searchDropdown.classList.remove('active'), 500);
    });
  });

  document.addEventListener('click', (e) => {
    if (!searchDropdown.contains(e.target) && !searchBtn.contains(e.target)) {
      searchDropdown.classList.remove('active');
    }
  });

  // Share & Wishlist
  const wishlistBtn = document.getElementById('wishlistBtn');
  let isWishlisted = false;
  wishlistBtn.addEventListener('click', () => {
    isWishlisted = !isWishlisted;
    const icon = wishlistBtn.querySelector('.material-symbols-outlined');
    if (isWishlisted) {
      icon.textContent = 'bookmark';
      showToast('Adicionado à sua Lista de Desejos!');
    } else {
      icon.textContent = 'bookmark_border';
      showToast('Removido da Lista de Desejos.');
    }
  });

  const shareBtn = document.getElementById('shareBtn');
  shareBtn.addEventListener('click', () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast('Link copiado para a área de transferência!');
    } else {
      showToast('Link pronto para compartilhamento!');
    }
  });

  // Global Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      trailerModal.classList.remove('active');
      installModal.classList.remove('active');
      aboutModal.classList.remove('active');
      lightbox.classList.remove('active');
      searchDropdown.classList.remove('active');
    }
  });

  // Initial Render
  renderAll();

});
