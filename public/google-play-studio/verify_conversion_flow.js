const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('PAGE ERROR:', msg.text());
  });

  console.log('1. Navegando para o estúdio...');
  await page.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle' });

  // 1. Screenshot do Studio Completo
  await page.screenshot({ path: 'test_studio_full.png', fullPage: false });
  console.log('Screenshot gravado: test_studio_full.png');

  // 2. Selecionar o novo modelo "Jadlog envio"
  console.log('2. Selecionando modelo Jadlog envio...');
  await page.selectOption('#presetSelect', 'jadlog');
  await page.waitForTimeout(500);

  // 3. Ativar modo Mobile (390px)
  console.log('3. Ativando modo Mobile 390px...');
  await page.click('#vpMobileBtn');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test_mobile_view.png', fullPage: false });
  console.log('Screenshot gravado: test_mobile_view.png');

  // 4. Testar o clique no botão Instalar e verificar o progresso
  console.log('4. Clicando em Instalar para testar o fluxo de alta conversão...');
  await page.click('#installBtn');

  // Aguardar 1.5s para capturar o estado em andamento (downloading + snake loader)
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test_download_progress.png', fullPage: false });
  console.log('Screenshot gravado: test_download_progress.png');

  // Aguardar o download concluir (total ~4.5s)
  console.log('5. Aguardando conclusão do download e surgimento do overlay...');
  await page.waitForTimeout(4000);

  // Verificar se o overlay e a seta ficaram visíveis
  const overlayVisible = await page.$eval('#pageOverlay', el => el.classList.contains('visible'));
  const arrowDisplay = await page.$eval('#openArrowIndicator', el => window.getComputedStyle(el).display);
  const btnText = await page.$eval('#displayInstallBtn', el => el.textContent.trim());

  console.log('--- RESULTADOS DO TESTE ---');
  console.log('Overlay visível:', overlayVisible);
  console.log('Display da Seta:', arrowDisplay);
  console.log('Texto do Botão:', btnText);

  await page.screenshot({ path: 'test_overlay_arrow.png', fullPage: false });
  console.log('Screenshot gravado: test_overlay_arrow.png');

  await browser.close();
  console.log('Todos os testes concluídos!');
})();
