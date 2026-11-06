const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log('1. Iniciando teste de sincronização 99% e edição de banner...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960 });

  await page.goto('http://127.0.0.1:5500/', { waitUntil: 'domcontentloaded' });
  await wait(800);

  // 1. Inserir link do Google Play no campo de sincronização
  console.log('2. Inserindo link do myJadlog no campo de sincronização...');
  const playUrl = 'https://play.google.com/store/apps/details?id=com.dpdgroup.chatbot.jadlog.prod&hl=pt_BR';
  await page.type('#inputGooglePlayUrl', playUrl);
  await wait(300);

  // 2. Clicar no botão Sincronizar
  console.log('3. Clicando em Sincronizar...');
  await page.click('#btnSyncGooglePlay');
  await wait(4500); // Aguardar o fetch e render

  // Verificar se sincronizou
  const syncedTitle = await page.$eval('#displayAppTitle', el => el.textContent.trim());
  const syncedDev = await page.$eval('#displayDeveloper', el => el.textContent.trim());
  const syncedRating = await page.$eval('#displayRatingVal', el => el.textContent.trim());
  console.log('--- DADOS APÓS SINCRONIZAÇÃO VIA LINK ---');
  console.log('Título:', syncedTitle);
  console.log('Desenvolvedor:', syncedDev);
  console.log('Nota:', syncedRating);

  await page.screenshot({ path: path.join(__dirname, 'evidence_sync_success.png') });
  console.log('Screenshot gravado: evidence_sync_success.png');

  // 3. Testar troca e customização completa do Banner
  console.log('4. Testando edição completa do banner (Full Cover + Gradiente)...');
  await page.select('#inputBannerMode', 'full_cover');
  await wait(500);
  await page.screenshot({ path: path.join(__dirname, 'evidence_banner_full_cover.png') });
  console.log('Screenshot gravado: evidence_banner_full_cover.png');

  // 4. Testar modo Solid Color
  console.log('5. Testando modo Solid Color...');
  await page.select('#inputBannerMode', 'solid_color');
  await page.type('#inputBannerColor', '#1a233a');
  await wait(500);
  await page.screenshot({ path: path.join(__dirname, 'evidence_banner_solid_color.png') });
  console.log('Screenshot gravado: evidence_banner_solid_color.png');

  // 5. Retornar ao modo padrão e testar Mobile 390px
  console.log('6. Testando visualização mobile sincronizada...');
  await page.select('#inputBannerMode', 'right_art');
  await page.click('#vpMobileBtn');
  await wait(500);
  await page.screenshot({ path: path.join(__dirname, 'evidence_synced_mobile.png') });
  console.log('Screenshot gravado: evidence_synced_mobile.png');

  // Copiar para a pasta de artefatos
  const artDir = 'C:\\Users\\Dell\\.gemini\\antigravity\\brain\\9c789cfd-9c2d-4cac-9cd6-45b9884681ec';
  ['evidence_sync_success.png', 'evidence_banner_full_cover.png', 'evidence_banner_solid_color.png', 'evidence_synced_mobile.png'].forEach(file => {
    fs.copyFileSync(path.join(__dirname, file), path.join(artDir, file));
  });
  console.log('Todas as evidências copiadas com sucesso!');

  await browser.close();
  console.log('--- TESTES FINALIZADOS COM SUCESSO! ---');
})();
