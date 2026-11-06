const fs = require('fs');
const html = fs.readFileSync('jadlog_official_play.html', 'utf8');

const imgRegex = /https:\/\/play-lh\.googleusercontent\.com\/[a-zA-Z0-9_\-=]+/g;
const allImgs = [...new Set(html.match(imgRegex) || [])];
const screenshots = allImgs.filter(url => url.includes('w526-h296') || url.includes('w1052-h592') || url.includes('w720-h310') || url.includes('w480-h960'));
console.log('Screenshots detected:', screenshots);

const descIdx = html.indexOf('data-g-id="description"');
if (descIdx !== -1) {
  console.log('--- DESCRIPTION ---');
  console.log(html.substring(descIdx, descIdx + 1200));
}
