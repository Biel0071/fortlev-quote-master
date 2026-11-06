const puppeteer = require('puppeteer-core');
const path = require('path');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle0' });

  // 1. Test Install Modal
  await page.click('#installBtn');
  await wait(500);
  await page.screenshot({ path: path.join(__dirname, 'modal_install_open.png') });
  await page.click('#closeInstallBtn');
  await wait(300);

  // 2. Test Trailer Modal
  await page.click('#trailerBtn');
  await wait(500);
  await page.screenshot({ path: path.join(__dirname, 'modal_trailer_open.png') });
  await page.click('#closeTrailerBtn');
  await wait(300);

  // 3. Test About Modal
  await page.click('#aboutModalBtn');
  await wait(500);
  await page.screenshot({ path: path.join(__dirname, 'modal_about_open.png') });
  await page.click('#closeAboutBtn');
  await wait(300);

  // 4. Test Lightbox
  await page.click('.screenshot-card');
  await wait(500);
  await page.screenshot({ path: path.join(__dirname, 'lightbox_open.png') });
  await page.click('#lightboxClose');

  await browser.close();
  console.log('All interactive modals tested and screenshots captured!');
})();
