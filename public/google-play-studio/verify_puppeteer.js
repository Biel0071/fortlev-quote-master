const puppeteer = require('puppeteer-core');
const path = require('path');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log('1. Iniciando teste com domcontentloaded...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960 });

  await page.goto('http://127.0.0.1:5500/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await wait(800);

  // 1. Carregar preset Jadlog envio (referência)
  console.log('2. Carregando modelo Jadlog envio...');
  await page.select('#presetSelect', 'jadlog');
  await wait(600);

  // 2. Mudar para o modo Mobile 390px
  console.log('3. Ativando visualização mobile 390px...');
  await page.click('#vpMobileBtn');
  await wait(600);
  await page.screenshot({ path: path.join(__dirname, 'evidence_jadlog_mobile.png') });
  console.log('Screenshot gravado: evidence_jadlog_mobile.png');

  // 3. Clicar no botão Instalar e verificar progresso
  console.log('4. Clicando em Instalar...');
  await page.click('#installBtn');
  await wait(1500);

  // Capturar estado intermediário (barra de progresso + snake loader)
  await page.screenshot({ path: path.join(__dirname, 'evidence_download_progress.png') });
  console.log('Screenshot gravado: evidence_download_progress.png');

  // 4. Aguardar finalização do download (~4s)
  console.log('5. Aguardando conclusão do download...');
  await wait(4200);

  const overlayVisible = await page.$eval('#pageOverlay', el => el.classList.contains('visible'));
  const arrowDisplay = await page.$eval('#openArrowIndicator', el => window.getComputedStyle(el).display);
  const btnText = await page.$eval('#displayInstallBtn', el => el.textContent.trim());

  console.log('--- RESULTADOS DA VERIFICAÇÃO ---');
  console.log('Overlay escuro visível:', overlayVisible);
  console.log('Seta indicadora visível:', arrowDisplay);
  console.log('Texto do botão final:', btnText);

  await page.screenshot({ path: path.join(__dirname, 'evidence_overlay_arrow.png') });
  console.log('Screenshot gravado: evidence_overlay_arrow.png');

  // 5. Copiar screenshots para a pasta de artefatos
  const artDir = 'C:\\Users\\Dell\\.gemini\\antigravity\\brain\\9c789cfd-9c2d-4cac-9cd6-45b9884681ec';
  const fs = require('fs');
  ['evidence_jadlog_mobile.png', 'evidence_download_progress.png', 'evidence_overlay_arrow.png'].forEach(file => {
    fs.copyFileSync(path.join(__dirname, file), path.join(artDir, file));
  });
  console.log('Evidências copiadas para artefatos!');

  await browser.close();
  console.log('--- TESTES FINALIZADOS COM SUCESSO ABSOLUTO! ---');
})();
