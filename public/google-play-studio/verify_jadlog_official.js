const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log('1. Iniciando teste de captura...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Limpar localStorage para testar fresh
  await page.goto('http://127.0.0.1:5500/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await wait(600);

  // Selecionar Jadlog envio
  console.log('2. Selecionando Jadlog envio...');
  await page.select('#presetSelect', 'jadlog');
  await wait(600);

  // Capturar 1: Desktop Fluido
  console.log('3. Capturando Desktop Fluido...');
  await page.setViewport({ width: 1440, height: 960 });
  await page.click('#vpDesktopBtn');
  await wait(500);
  await page.screenshot({ path: path.join(__dirname, 'evidence_jadlog_desktop.png') });

  // Rolar até resenhas no Desktop
  await page.evaluate(() => {
    document.getElementById('previewArea').scrollTop = 1200;
  });
  await wait(500);
  await page.screenshot({ path: path.join(__dirname, 'evidence_jadlog_reviews_desktop.png') });

  // Capturar 2: Mobile 390px
  console.log('4. Capturando Mobile 390px...');
  await page.evaluate(() => {
    document.getElementById('previewArea').scrollTop = 0;
  });
  await page.click('#vpMobileBtn');
  await wait(500);
  await page.screenshot({ path: path.join(__dirname, 'evidence_jadlog_mobile_full.png') });

  // Testar clique no botão Instalar e verificar progresso
  console.log('5. Testando clique em Instalar...');
  await page.click('#installBtn');
  await wait(1200);
  await page.screenshot({ path: path.join(__dirname, 'evidence_jadlog_installing.png') });

  // Aguardar overlay e seta
  console.log('6. Aguardando conclusão do download e overlay...');
  await wait(4000);
  await page.screenshot({ path: path.join(__dirname, 'evidence_jadlog_download_complete.png') });

  // Copiar para a pasta de artefatos
  const artDir = 'C:\\Users\\Dell\\.gemini\\antigravity\\brain\\9c789cfd-9c2d-4cac-9cd6-45b9884681ec';
  ['evidence_jadlog_desktop.png', 'evidence_jadlog_reviews_desktop.png', 'evidence_jadlog_mobile_full.png', 'evidence_jadlog_installing.png', 'evidence_jadlog_download_complete.png'].forEach(file => {
    fs.copyFileSync(path.join(__dirname, file), path.join(artDir, file));
  });
  console.log('Todas as evidências copiadas com sucesso!');

  await browser.close();
  console.log('--- TESTES FINALIZADOS COM SUCESSO! ---');
})();
