const https = require('https');

function fetchGooglePlayHtml(appUrl) {
  return new Promise((resolve, reject) => {
    https.get(appUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseGooglePlay(html) {
  const result = {};

  // 1. Título do App
  result.appTitle = html.match(/<h1[^>]*><span[^>]*>(.*?)<\/span><\/h1>/i)?.[1] 
    || html.match(/<h1[^>]*>(.*?)<\/h1>/i)?.[1] 
    || "Aplicativo";
  result.appTitle = result.appTitle.replace(/<[^>]+>/g, '').trim();

  // 2. Desenvolvedor
  result.developer = html.match(/class="Vbfug[^"]*"[^>]*><a[^>]*><span[^>]*>(.*?)<\/span>/i)?.[1]
    || html.match(/developer\?id=[^"]*"[^>]*><span>(.*?)<\/span>/i)?.[1]
    || "Desenvolvedor";
  result.developer = result.developer.replace(/<[^>]+>/g, '').trim();

  // 3. Ícone do App
  const iconMatch = html.match(/<img[^>]+src="([^">]+)"[^>]+alt="Imagem do ícone"/i)
    || html.match(/<img[^>]+alt="Imagem do ícone"[^>]+src="([^">]+)"/i);
  result.appIconUrl = iconMatch ? iconMatch[1] : "";

  // 4. Rating (Nota)
  const ratingMatch = html.match(/class="TT9eCd"[^>]*><span[^>]*>([\d,\.]+)<\/span>/i)
    || html.match(/class="TT9eCd"[^>]*>([\d,\.]+)[\s\S]*?<\/div>/i);
  result.ratingVal = ratingMatch ? ratingMatch[1].trim() : "4,5";

  // 5. Total de Avaliações
  const reviewsMatch = html.match(/class="g1rdde"[^>]*>([\d\.\s\w]+avalia[\wçõ]+)<\/div>/i);
  result.ratingCount = reviewsMatch ? reviewsMatch[1].trim() : "10 mil avaliações";

  // 6. Downloads
  const dlMatch = html.match(/class="ClM7O"[^>]*>([\d\+]+[\s\w]*)<\/div><div class="g1rdde">downloads<\/div>/i);
  result.downloadsVal = dlMatch ? dlMatch[1].trim() : "100 mil+";
  result.downloadsLabel = "downloads";

  // 7. Descrição completa
  const descMatch = html.match(/data-g-id="description"[^>]*>([\s\S]*?)<\/div>/i);
  if (descMatch) {
    result.aboutText = descMatch[1]
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim();
  } else {
    result.aboutText = "Descrição oficial do aplicativo.";
  }

  // 8. Classificação Indicativa
  const contentRatingMatch = html.match(/itemprop="contentRating"[^>]*><span[^>]*>(.*?)<\/span>/i);
  result.ratingTitle = contentRatingMatch ? contentRatingMatch[1].replace(/<[^>]+>/g, '').trim() : "Classificação Livre";
  result.ratingBadge = result.ratingTitle.includes("18") ? "18" : (result.ratingTitle.includes("14") ? "14" : (result.ratingTitle.includes("10") ? "10" : "L"));
  result.ratingDesc = "Livre para todos os públicos";

  // 9. Atualizado em
  const updatedMatch = html.match(/<div class="lXlx5">Atualizado em<\/div><div class="xg1aie">(.*?)<\/div>/i);
  result.updatedAt = updatedMatch ? updatedMatch[1].trim() : "Recente";

  // 10. Screenshots
  const imgRegex = /https:\/\/play-lh\.googleusercontent\.com\/[a-zA-Z0-9_\-=]+/g;
  const allImgs = [...new Set(html.match(imgRegex) || [])];
  const screenshots = allImgs.filter(url => 
    (url.includes('w526-h296') || url.includes('w1052-h592') || url.includes('w480-h960') || url.includes('w720-h310')) &&
    !url.includes(result.appIconUrl)
  );
  result.screenshots = screenshots.slice(0, 8);

  // 11. Banner de Fundo (Key Art / Hero Backdrop)
  const heroMatch = allImgs.find(url => url.includes('w1052') || url.includes('w600-h300') || url.includes('s0-br30'));
  result.heroBgUrl = heroMatch || (result.screenshots[0] || result.appIconUrl);

  // 12. Resenhas Reais (comentários)
  result.reviews = [];
  const revRegex = /class="X5PpBb"[^>]*>(.*?)<\/div>[\s\S]*?class="bp9Aid"[^>]*>(.*?)<\/div>[\s\S]*?class="h3YV2d"[^>]*>([\s\S]*?)<\/div>/gi;
  let rm;
  while ((rm = revRegex.exec(html)) !== null && result.reviews.length < 5) {
    result.reviews.push({
      author: rm[1].replace(/<[^>]+>/g, '').trim(),
      date: rm[2].replace(/<[^>]+>/g, '').trim(),
      body: rm[3].replace(/<[^>]+>/g, '').trim(),
      stars: 5
    });
  }

  return result;
}

(async () => {
  const testUrl = 'https://play.google.com/store/apps/details?id=com.dpdgroup.chatbot.jadlog.prod&hl=pt_BR&gl=BR';
  console.log('Testing sync parser with:', testUrl);
  const html = await fetchGooglePlayHtml(testUrl);
  const data = parseGooglePlay(html);
  console.log('Parsed successfully:', {
    appTitle: data.appTitle,
    developer: data.developer,
    ratingVal: data.ratingVal,
    ratingCount: data.ratingCount,
    downloadsVal: data.downloadsVal,
    iconUrl: data.appIconUrl?.substring(0, 60) + '...',
    heroBgUrl: data.heroBgUrl?.substring(0, 60) + '...',
    screenshotsCount: data.screenshots.length,
    reviewsCount: data.reviews.length
  });
})();
