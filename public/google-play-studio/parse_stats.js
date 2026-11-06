const fs = require('fs');
const html = fs.readFileSync('jadlog_official_play.html', 'utf8');

const idx = html.indexOf('902 avaliações');
if (idx !== -1) {
  console.log(html.substring(idx - 600, idx + 400));
}

// Procurar downloads
const dlIdx = html.indexOf('downloads');
if (dlIdx !== -1) {
  console.log('--- Downloads Context ---');
  console.log(html.substring(dlIdx - 200, dlIdx + 200));
}
