const fs = require('fs');
const html = fs.readFileSync('jadlog_official_play.html', 'utf8');

// Extrair título do app
const title = html.match(/<h1[^>]*><span[^>]*>(.*?)<\/span><\/h1>/i)?.[1] || html.match(/<h1[^>]*>(.*?)<\/h1>/i)?.[1];
console.log('App Title:', title);

// Desenvolvedor
const dev = html.match(/class="Vbfug[^"]*"[^>]*><a[^>]*><span[^>]*>(.*?)<\/span>/i)?.[1] || html.match(/developer[^>]*>(.*?)<\/div>/i)?.[1];
console.log('Developer:', dev);

// Rating
const rating = html.match(/class="TT9eCd"[^>]*>([\d,\.]+)[\s\S]*?<\/div>/i)?.[1];
console.log('Rating:', rating);

// Reviews count
const reviews = html.match(/class="g1rdde"[^>]*>([\d\.\s\w]+avalia[\wçõ]+)<\/div>/i)?.[1];
console.log('Reviews Count:', reviews);

// Downloads
const downloads = html.match(/class="ClM7O"[^>]*>([\d\+]+[\s\w]*)<\/div><div class="g1rdde">downloads<\/div>/i)?.[1];
console.log('Downloads:', downloads);

// Ícone do app
const iconMatch = html.match(/<img[^>]+src="([^">]+)"[^>]+alt="Imagem do ícone"/i) || html.match(/<img[^>]+alt="Imagem do ícone"[^>]+src="([^">]+)"/i);
console.log('Icon URL:', iconMatch?.[1]);

// Screenshots
const screenshotMatches = [...html.matchAll(/<img[^>]+src="([^">]+)"[^>]+alt="Captura de tela"/gi)].map(m => m[1]);
console.log('Screenshots found:', screenshotMatches.length);
screenshotMatches.slice(0, 5).forEach((s, i) => console.log(`Screenshot ${i+1}:`, s));

// O que há de novo / Novidades
const whatsNew = html.match(/data-g-id="description"[^>]*>([\s\S]*?)<\/div>/i);
console.log('Desc snippet:', whatsNew?.[1]?.substring(0, 300));
