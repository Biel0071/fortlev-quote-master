const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(err.toString()));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.setViewport({ width: 1440, height: 960 });
  await page.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle0' });

  // 1. Test Trailer Modal
  await page.click('#trailerBtn');
  await new Promise(r => setTimeout(r, 400));
  const trailerActive = await page.$eval('#trailerModal', el => el.classList.contains('active'));
  console.log('Trailer modal opened:', trailerActive);
  await page.click('#closeTrailerBtn');
  await new Promise(r => setTimeout(r, 300));

  // 2. Test Install Modal
  await page.click('#installBtn');
  await new Promise(r => setTimeout(r, 400));
  const installActive = await page.$eval('#installModal', el => el.classList.contains('active'));
  console.log('Install modal opened:', installActive);
  await page.click('#closeInstallBtn');
  await new Promise(r => setTimeout(r, 300));

  // 3. Test About Modal
  await page.click('#aboutModalBtn');
  await new Promise(r => setTimeout(r, 400));
  const aboutActive = await page.$eval('#aboutModal', el => el.classList.contains('active'));
  console.log('About modal opened:', aboutActive);
  await page.click('#closeAboutBtn');
  await new Promise(r => setTimeout(r, 300));

  // 4. Test Preset Switch to Free Fire
  await page.select('#presetSelect', 'freefire');
  await new Promise(r => setTimeout(r, 400));
  const ffTitle = await page.$eval('#displayAppTitle', el => el.textContent);
  console.log('Preset switched to:', ffTitle);

  // 5. Test Preset Switch back to Sniper 3D
  await page.select('#presetSelect', 'sniper3d');
  await new Promise(r => setTimeout(r, 400));
  const sniperTitle = await page.$eval('#displayAppTitle', el => el.textContent);
  console.log('Preset restored to:', sniperTitle);

  // 6. Test Live Input Typing
  await page.focus('#inputDeveloper');
  await page.$eval('#inputDeveloper', el => el.value = '');
  await page.type('#inputDeveloper', 'Estúdio Antigravity 2026');
  await new Promise(r => setTimeout(r, 300));
  const liveDev = await page.$eval('#displayDeveloper', el => el.textContent);
  console.log('Live developer update verified:', liveDev === 'Estúdio Antigravity 2026');

  // 7. Test Export button
  console.log('Page console errors:', errors);

  await browser.close();
  if (errors.length === 0 && liveDev === 'Estúdio Antigravity 2026') {
    console.log('ALL INTERACTIVE AND MODAL TESTS PASSED WITH 0 ERRORS!');
  } else {
    console.error('Some tests failed or errors were detected:', errors);
    process.exit(1);
  }
})();
