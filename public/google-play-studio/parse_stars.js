const fs = require('fs');
const html = fs.readFileSync('jadlog_official_play.html', 'utf8');

const regex = /class="X5PpBb"[^>]*>(.*?)<\/div>[\s\S]*?aria-label="Avaliado com (\d) de 5 estrelas"[\s\S]*?class="bp9Aid"[^>]*>(.*?)<\/div>[\s\S]*?class="h3YV2d"[^>]*>([\s\S]*?)<\/div>/gi;
let m;
let count = 0;
while ((m = regex.exec(html)) !== null && count < 10) {
  count++;
  console.log(`Review ${count}: ${m[1].trim()} - ${m[2]}★ - ${m[3].replace(/<[^>]+>/g, '').trim()}`);
}
