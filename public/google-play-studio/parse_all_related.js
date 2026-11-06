const fs = require('fs');
const html = fs.readFileSync('jadlog_official_play.html', 'utf8');

const regex = /<a class="Si6A0c nT2RTe"[^>]*href="\/store\/apps\/details\?id=([^"]+)"[\s\S]*?<img src="([^"]+)"[\s\S]*?<span class="DdYX5">([^<]+)<\/span>[\s\S]*?<span class="wMUdtb">([^<]+)<\/span>[\s\S]*?<span class="w2kbF">([^<]+)<\/span>/gi;

let m;
let count = 0;
while ((m = regex.exec(html)) !== null) {
  count++;
  console.log(`\n--- RELATED APP ${count} ---`);
  console.log('ID:', m[1]);
  console.log('Icon:', m[2]);
  console.log('Title:', m[3]);
  console.log('Developer:', m[4]);
  console.log('Rating:', m[5]);
}
