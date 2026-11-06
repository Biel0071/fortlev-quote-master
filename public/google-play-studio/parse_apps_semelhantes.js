const fs = require('fs');
const html = fs.readFileSync('jadlog_official_play.html', 'utf8');

const idx = html.indexOf('Apps semelhantes');
if (idx !== -1) {
  console.log(html.substring(idx - 100, idx + 4000));
}
