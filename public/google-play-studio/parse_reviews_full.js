const fs = require('fs');
const html = fs.readFileSync('jadlog_official_play.html', 'utf8');

const regex = /class="X5PpBb"[^>]*>(.*?)<\/div>[\s\S]*?class="bp9Aid"[^>]*>(.*?)<\/div>[\s\S]*?class="h3YV2d"[^>]*>([\s\S]*?)<\/div>/gi;
let m;
let count = 0;
while ((m = regex.exec(html)) !== null && count < 10) {
  count++;
  console.log(`\n--- REVIEW ${count} ---`);
  console.log('Autor:', m[1].replace(/<[^>]+>/g, '').trim());
  console.log('Data:', m[2].replace(/<[^>]+>/g, '').trim());
  console.log('Comentário:', m[3].replace(/<[^>]+>/g, '').trim());
}
