const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log('1. Iniciando teste de Apps Semelhantes e Sincronização...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960 });

  await page.goto('http://127.0.0.1:5500/', { waitUntil: 'domcontentloaded' });
  await wait(600);

  // 1. Carregar preset myJadlog
  console.log('2. Carregando modelo Jadlog envio...');
  await page.select('#presetSelect', 'jadlog');
  await wait(800);

  // Rolar até a barra lateral direita onde ficam os "Apps semelhantes"
  await page.evaluate(() => {
    document.getElementById('previewArea').scrollTop = 800;
  });
  await wait(500);

  // Capturar Desktop com Apps Semelhantes
  await page.screenshot({ path: path.join(__dirname, 'evidence_related_apps_desktop.png') });
  console.log('Screenshot gravado: evidence_related_apps_desktop.png');

  // Rolar até o final no Desktop
  await page.evaluate(() => {
    document.getElementById('previewArea').scrollTop = 1600;
  });
  await wait(500);
  await page.screenshot({ path: path.join(__dirname, 'evidence_related_apps_desktop_full.png') });
  console.log('Screenshot gravado: evidence_related_apps_desktop_full.png');

  // Modo Mobile (390px)
  console.log('3. Ativando modo Mobile 390px...');
  await page.click('#vpMobileBtn');
  await wait(500);
  await page.evaluate(() => {
    document.getElementById('previewArea').scrollTop = 1800;
  });
  await wait(500);
  await page.screenshot({ path: path.join(__dirname, 'evidence_related_apps_mobile.png') });
  console.log('Screenshot gravado: evidence_related_apps_mobile.png');

  // Copiar para a pasta de artefatos
  const artDir = 'C:\\Users\\Dell\\.gemini\antigravity\\brain\\9c789cfd-9c2d-4cac-9cd6-45b9884681ec';
  ['evidence_related_apps_desktop.png', 'evidence_related_apps_desktop_full.png', 'evidence_related_apps_mobile.png'].forEach(file => {
    fs.copyFileSync(path.join(__dirname, file), path.join(artDir, file));
  });
  console.log('Evidências copiadas para a pasta de artefatos!');

  await browser.close();
  console.log('--- TESTES FINALIZADOS COM SUCESSO! ---');
})();
