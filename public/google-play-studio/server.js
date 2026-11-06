const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 5500;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json'
};

function fetchGooglePlayHtml(appUrl) {
  return new Promise((resolve, reject) => {
    // Garantir parâmetros em pt_BR
    let target = appUrl;
    if (!target.includes('hl=')) target += (target.includes('?') ? '&' : '?') + 'hl=pt_BR&gl=BR';

    https.get(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchGooglePlayHtml(res.headers.location).then(resolve).catch(reject);
      }
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
    || "Google Commerce Ltd";
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

  // 7. Subtítulo / Compras
  result.subtitle = "Contém anúncios · Grátis";

  // 8. Descrição completa
  const descMatch = html.match(/data-g-id="description"[^>]*>([\s\S]*?)<\/div>/i);
  if (descMatch) {
    result.aboutText = descMatch[1]
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim();
  } else {
    result.aboutText = "Descrição oficial do aplicativo.";
  }

  // 9. Classificação Indicativa
  const contentRatingMatch = html.match(/itemprop="contentRating"[^>]*><span[^>]*>(.*?)<\/span>/i);
  result.ratingTitle = contentRatingMatch ? contentRatingMatch[1].replace(/<[^>]+>/g, '').trim() : "Classificação Livre";
  result.ratingBadge = result.ratingTitle.includes("18") ? "18" : (result.ratingTitle.includes("14") ? "14" : (result.ratingTitle.includes("10") ? "10" : "L"));
  result.ratingDesc = "Livre para todos os públicos";

  // 10. Atualizado em
  const updatedMatch = html.match(/<div class="lXlx5">Atualizado em<\/div><div class="xg1aie">(.*?)<\/div>/i);
  result.updatedAt = updatedMatch ? updatedMatch[1].trim() : "Recente";

  // 11. Screenshots
  const imgRegex = /https:\/\/play-lh\.googleusercontent\.com\/[a-zA-Z0-9_\-=]+/g;
  const allImgs = [...new Set(html.match(imgRegex) || [])];
  const screenshots = allImgs.filter(url => 
    (url.includes('w526-h296') || url.includes('w1052-h592') || url.includes('w480-h960') || url.includes('w720-h310')) &&
    !url.includes(result.appIconUrl)
  );
  result.screenshots = screenshots.slice(0, 8);

  // 12. Banner de Fundo (Key Art / Hero Backdrop)
  const heroMatch = allImgs.find(url => url.includes('w1052') || url.includes('w600-h300') || url.includes('s0-br30'));
  result.heroBgUrl = heroMatch || (result.screenshots[0] || result.appIconUrl || 'assets/hero_key_art.png');

  // 13. Resenhas Reais (comentários)
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

  // 14. Apps Semelhantes / Outros Apps Laterais
  result.relatedApps = [];
  const relRegex = /<a class="Si6A0c nT2RTe"[^>]*href="\/store\/apps\/details\?id=([^"]+)"[\s\S]*?<img src="([^"]+)"[\s\S]*?<span class="DdYX5">([^<]+)<\/span>[\s\S]*?<span class="wMUdtb">([^<]+)<\/span>[\s\S]*?<span class="w2kbF">([^<]+)<\/span>/gi;
  let relM;
  while ((relM = relRegex.exec(html)) !== null && result.relatedApps.length < 6) {
    result.relatedApps.push({
      id: relM[1],
      icon: relM[2],
      name: relM[3].trim(),
      developer: relM[4].trim(),
      rating: relM[5].trim()
    });
  }

  // 15. Botões e Ações
  result.installBtn = "Instalar";
  result.installOtherBtn = "Instalar em outros dispositivos";
  result.disclaimer = "Ao fazer o download do app, você concorda com os Termos de Serviço do Google e do Google Play.";

  return result;
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);

  // Endpoint de Sincronização Automática via Link do Google Play
  if (parsedUrl.pathname === '/api/sync-google-play') {
    const playUrl = parsedUrl.query.url;
    if (!playUrl || !playUrl.includes('play.google.com')) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'URL do Google Play inválida.' }));
    }

    try {
      console.log(`[SYNC API] Baixando dados de: ${playUrl}`);
      const html = await fetchGooglePlayHtml(playUrl);
      const appData = parseGooglePlay(html);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, data: appData }));
    } catch (err) {
      console.error('[SYNC API ERROR]', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Falha ao sincronizar: ' + err.message }));
    }
  }

  let reqPath = decodeURI(parsedUrl.pathname);
  if (reqPath === '/') reqPath = '/index.html';
  
  const filePath = path.join(__dirname, reqPath);
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 Server Error: ' + err.code);
      }
    } else {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running at http://127.0.0.1:${PORT}/ with /api/sync-google-play`);
});
