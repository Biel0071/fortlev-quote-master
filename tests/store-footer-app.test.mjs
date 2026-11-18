import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

function readRel(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

test("StoreFooter and trust badges expose WhatsApp, Institucional, Ajuda, Google Play only, and top-scrolling 4,8 seals", () => {
  const footer = readRel("src/components/store/StoreFooter.tsx");
  const badges = readRel("src/components/store/TrustAndAppBadges.tsx");

  assert.match(footer, /Fale pelo WhatsApp/);
  assert.match(footer, /31973484203/);
  assert.match(footer, /Institucional/);
  assert.match(footer, /Ajuda/);
  assert.match(footer, /Baixe nosso aplicativo/);
  assert.match(footer, /GooglePlayStoreBadge\s+to="\/google-play"/);
  assert.match(footer, /GoogleRatingBadge\s+rating="4,8"\s+onClick=\{scrollToTop\}/);
  assert.match(footer, /seloSafeBrowsing/);
  assert.match(footer, /seloLojaProtegida/);
  assert.match(footer, /window\.scrollTo\(\{\s*top:\s*0,\s*behavior:\s*"smooth"\s*\}\)/);

  assert.match(badges, /Disponível no/);
  assert.match(badges, /Google Play/);
  assert.match(badges, /to\s*=\s*"\/google-play"/);
  assert.match(badges, /Google Rating/);
  assert.match(badges, /rating\s*=\s*"4,8"/);

  assert.doesNotMatch(footer, /app\s*store/i);
  assert.doesNotMatch(badges, /app\s*store/i);
});

test("Every public store, account, and quotation page includes StoreFooter or StoreLayout", () => {
  const layout = readRel("src/components/store/layout/StoreLayout.tsx");
  assert.match(layout, /<StoreFooter\s+footer=\{footer\}\s+pageLinks=\{pageLinks\}\s*\/>/);

  const pagesRequiringFooter = [
    "src/pages/store/StoreHome.tsx",
    "src/pages/store/StoreCatalog.tsx",
    "src/pages/store/OffersPage.tsx",
    "src/pages/store/ProductPage.tsx",
    "src/pages/store/CartPage.tsx",
    "src/pages/store/CheckoutPage.tsx",
    "src/pages/store/PaymentPendingPage.tsx",
    "src/pages/store/StorePage.tsx",
    "src/pages/store/PublicTrackingSearch.tsx",
    "src/pages/account/TrackingPage.tsx",
    "src/pages/account/OrdersPage.tsx",
    "src/pages/account/AccountPage.tsx",
    "src/modules/checkout/pages/QuotationsIndex.tsx",
  ];

  for (const relPath of pagesRequiringFooter) {
    const src = readRel(relPath);
    assert.ok(
      src.includes("<StoreFooter") || src.includes("<StoreLayout"),
      `${relPath} must render StoreFooter or StoreLayout`,
    );
  }
});

test("GooglePlayDownloadPage and APK Studio default to Material Online on Google Play only", () => {
  const appPage = readRel("src/pages/store/GooglePlayDownloadPage.tsx");
  const studioHtml = readRel("public/google-play-studio/index.html");
  const studioScript = readRel("public/google-play-studio/script.js");

  assert.match(appPage, /Material Online/);
  assert.match(appPage, /storeLogoPure/);
  assert.match(appPage, /4,8/);
  assert.match(appPage, /Apenas Google Play \(Android\)/);
  assert.doesNotMatch(appPage, /app\s*store/i);
  assert.doesNotMatch(appPage, /\/downloads\/style\.css/);

  assert.match(studioHtml, /<option value="material_online" selected>Material Online/);
  assert.match(studioScript, /material_online:\s*\{[\s\S]*appTitle:\s*"Material Online"[\s\S]*appIconUrl:\s*"assets\/material_online_logo\.png"[\s\S]*ratingVal:\s*"4,8"/);
  assert.match(studioScript, /PRESETS\.material_online/);
});

test("App router and top download banner route directly to /google-play", () => {
  const appRoutes = readRel("src/App.tsx");
  const topBanner = readRel("src/components/store/AppDownloadBanner.tsx");

  assert.match(appRoutes, /<Route path="\/google-play" element=\{<GooglePlayDownloadPage \/>\} \/>/);
  assert.match(topBanner, /encodeEncryptedLink\("\/google-play"/);
  assert.doesNotMatch(topBanner, /\/functions\/v1\/download-app/);
});
