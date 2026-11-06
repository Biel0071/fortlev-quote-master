const fs = require('fs');
const html = fs.readFileSync('jadlog_official_play.html', 'utf8');

// Procurar seção de outros apps / semelhantes / apps relacionados
const searchTerms = ['Apps semelhantes', 'Apps relacionados', 'Mais do desenvolvedor', 'Itens semelhantes', 'apps'];
searchTerms.forEach(term => {
  const idx = html.indexOf(term);
  console.log(`Term "${term}":`, idx !== -1 ? `found at ${idx}` : 'not found');
});

// Procurar classes de cards de outros apps no HTML oficial do Google Play
const cardMatches = [...html.matchAll(/class="[^\"]*(Si6A0c|VfPpkd-ESNqnb|f5NCO|ubGTWe|kP9VU)[^\"]*"[^>]*>/gi)];
console.log('App card elements found:', cardMatches.length);

// Procurar títulos e links de apps recomendados
const linkMatches = [...html.matchAll(/href="\/store\/apps\/details\?id=([^"&]+)"/gi)].map(m => m[1]);
const uniqueApps = [...new Set(linkMatches)].filter(id => id !== 'com.dpdgroup.chatbot.jadlog.prod');
console.log('Related App IDs found on page:', uniqueApps);
