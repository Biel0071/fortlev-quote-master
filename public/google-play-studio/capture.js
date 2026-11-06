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
  await page.setViewport({ width: 1440, height: 960 });
  await page.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle0' });

  // Clear local storage and reload preset sniper3d to guarantee pristine state
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(600);

  // 1. Capture Full Studio Workspace (Admin on left + Desktop Store on right)
  await page.screenshot({ path: path.join(__dirname, 'preview_studio_editor.png') });

  // 2. Scroll preview area to inspect Event and Featured Cards
  const scrollInfo = await page.evaluate(() => {
    const el = document.getElementById('previewArea');
    if (el) {
      el.scrollTop = 500;
      return { scrollTop: el.scrollTop, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight };
    }
    return null;
  });
  console.log('Scroll info:', scrollInfo);
  await wait(500);
  await page.screenshot({ path: path.join(__dirname, 'preview_studio_scrolled.png') });

  // 3. Switch to Reference Mode (632px - exact match to user screenshot)
  await page.evaluate(() => {
    document.getElementById('previewArea').scrollTop = 0;
  });
  await page.click('#vpReferenceBtn');
  await wait(500);
  await page.screenshot({ path: path.join(__dirname, 'preview_studio_reference_mode.png') });

  // 4. Scroll preview area in Reference Mode to inspect exact fidelity of cards and sidebar
  await page.evaluate(() => {
    document.getElementById('previewArea').scrollTop = 500;
  });
  await wait(500);
  await page.screenshot({ path: path.join(__dirname, 'preview_studio_reference_scrolled.png') });

  // 5. Test Hiding Admin (100% full view)
  await page.evaluate(() => {
    const previewArea = document.querySelector('.preview-area');
    if (previewArea) previewArea.scrollTop = 0;
  });
  await page.click('#toggleAdminBtn');
  await wait(400);
  await page.screenshot({ path: path.join(__dirname, 'preview_studio_full_view.png') });

  // Restore admin for user
  await page.click('#toggleAdminBtn');
  await wait(300);

  await browser.close();
  console.log('All verification captures completed successfully!');
})();
