const fs = require('fs');
const html = fs.readFileSync('jadlog_official_play.html', 'utf8');

// Buscando rating e downloads
const numRegex = />(\d+[\.,]?\d*)\s*<i[^>]*>star<\/i>/i;
console.log('Star match:', html.match(numRegex)?.[1]);

// Procurar downloads
const dlRegex = /([0-9\+]+[\s\w]*downloads)/gi;
console.log('DL match:', [...html.matchAll(dlRegex)].map(m => m[1]).slice(0, 5));

// Procurar imagens de screenshot do Google Play (play-lh.googleusercontent.com)
const imgRegex = /https:\/\/play-lh\.googleusercontent\.com\/[a-zA-Z0-9_\-=]+/g;
const allImgs = [...new Set(html.match(imgRegex) || [])];
console.log('Total unique Google Play images:', allImgs.length);
allImgs.slice(0, 10).forEach((img, i) => console.log(`Img ${i+1}:`, img));

// Procurar resenhas / comentários
console.log('--- REVIEWS SEARCH ---');
// Procura nomes e textos de avaliação
const reviewAuthorRegex = /class="X5PpBb"[^>]*>(.*?)<\/div>/gi;
const authors = [...html.matchAll(reviewAuthorRegex)].map(m => m[1]);
console.log('Authors found:', authors.slice(0, 6));

const reviewBodyRegex = /class="h3YV2d"[^>]*>(.*?)<\/div>/gi;
const bodies = [...html.matchAll(reviewBodyRegex)].map(m => m[1]);
console.log('Bodies found:', bodies.slice(0, 6));

// Datas das avaliações
const reviewDateRegex = /class="bp9Aid"[^>]*>(.*?)<\/div>/gi;
const dates = [...html.matchAll(reviewDateRegex)].map(m => m[1]);
console.log('Dates found:', dates.slice(0, 6));
