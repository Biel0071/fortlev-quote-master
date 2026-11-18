import test from "node:test";
import assert from "node:assert/strict";
import {
  encodeEncryptedLink,
  decodeEncryptedToken,
  isSafeRedirectTarget,
  detectAppChannel,
} from "../src/utils/encryptedLinks.ts";
import {
  computeLeadPropensity,
  getDwellBucket,
  leadQualityLabel,
} from "../src/modules/tracking/scoreEngine.ts";

test("encodeEncryptedLink and decodeEncryptedToken round-trip safely and reject tampering", () => {
  const encoded = encodeEncryptedLink("/google-play", {
    source: "/",
    label: "footer_google_play",
    channel: "site",
  });

  assert.ok(encoded.startsWith("/r/enc1_"), `Expected /r/enc1_ prefix, got ${encoded}`);
  assert.ok(!encoded.includes("google-play"), "Encrypted URL must cloak destination path");

  const slug = encoded.replace(/^\/r\//, "");
  const decoded = decodeEncryptedToken(slug);
  assert.deepEqual(decoded, {
    targetUrl: "/google-play",
    source: "/",
    label: "footer_google_play",
    channel: "site",
  });

  // Tamper check
  const tampered = slug.slice(0, -2) + (slug.endsWith("AA") ? "BB" : "AA");
  assert.equal(decodeEncryptedToken(tampered), null);
});

test("WhatsApp links encode validly while unsafe open-redirects and admin paths are blocked", () => {
  const waEncoded = encodeEncryptedLink("https://wa.me/5531973484203", {
    source: "/loja",
    label: "footer_whatsapp",
    channel: "app",
  });
  assert.ok(waEncoded.startsWith("/r/enc1_"));
  const waDecoded = decodeEncryptedToken(waEncoded.replace(/^\/r\//, ""));
  assert.equal(waDecoded?.targetUrl, "https://wa.me/5531973484203");
  assert.equal(waDecoded?.channel, "app");

  assert.equal(isSafeRedirectTarget("https://evil.example/phish"), false);
  assert.equal(isSafeRedirectTarget("//evil.example/phish"), false);
  assert.equal(isSafeRedirectTarget("/admin/dashboard"), false);
  assert.equal(isSafeRedirectTarget("/r/loop"), false);
  assert.equal(encodeEncryptedLink("https://evil.example/phish"), "https://evil.example/phish");

  assert.equal(detectAppChannel("/google-play"), "app");
  assert.equal(detectAppChannel("/downloads/app"), "app");
  assert.equal(detectAppChannel("/loja"), "site");
});

test("computeLeadPropensity classifies bots, cold bounces, warm browsers, and ready-to-buy omnichannel leads", () => {
  const bot = computeLeadPropensity({
    siteTimeSeconds: 300,
    productViews: 5,
    cartActions: 3,
    isBot: true,
  });
  assert.equal(bot.probability, 0);
  assert.equal(bot.leadQuality, "bot");

  const cold = computeLeadPropensity({
    siteTimeSeconds: 8,
    totalPages: 1,
  });
  assert.equal(cold.leadQuality, "frio");
  assert.equal(cold.dwellBucket, "0-15s");
  assert.ok(cold.probability < 35);

  const warm = computeLeadPropensity({
    siteTimeSeconds: 95,
    totalPages: 4,
    encryptedClicks: 2,
    scrollDepth: 65,
    productViews: 2,
  });
  assert.equal(warm.leadQuality, "morno");
  assert.equal(warm.dwellBucket, "1-3m");
  assert.ok(warm.probability >= 35 && warm.probability < 65);

  const readyOmnichannel = computeLeadPropensity({
    siteTimeSeconds: 180,
    appTimeSeconds: 90,
    totalPages: 6,
    encryptedClicks: 4,
    scrollDepth: 90,
    productViews: 3,
    cartActions: 2,
    hasConversionAction: true,
    returnVisits: 3,
  });
  assert.equal(readyOmnichannel.leadQuality, "pronto_compra");
  assert.equal(readyOmnichannel.dwellBucket, "3-5m");
  assert.ok(readyOmnichannel.probability >= 85 && readyOmnichannel.probability <= 98);

  assert.equal(getDwellBucket(350), "5m+");
  assert.equal(leadQualityLabel("pronto_compra"), "Pronto p/ Compra");
});
