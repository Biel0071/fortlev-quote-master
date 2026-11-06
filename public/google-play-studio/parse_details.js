const fs = require('fs');
const html = fs.readFileSync('jadlog_official_play.html', 'utf8');

const regex = /<img[^>]+src="([^">]+)"[^>]+alt="Captura de tela"/gi;
let match;
while ((match = regex.exec(html)) !== null) {
  console.log('Screenshot match:', match[1]);
}

// Procurar 'O que há de novo'
const novidadesIdx = html.indexOf('O que há de novo');
if (novidadesIdx !== -1) {
  console.log('--- O QUE HÁ DE NOVO ---');
  console.log(html.substring(novidadesIdx, novidadesIdx + 500));
}

// Procurar Segurança dos dados
const secIdx = html.indexOf('Segurança dos dados');
if (secIdx !== -1) {
  console.log('--- SEGURANÇA DOS DADOS ---');
  console.log(html.substring(secIdx, secIdx + 800));
}
