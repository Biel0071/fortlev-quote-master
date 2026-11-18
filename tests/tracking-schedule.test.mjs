import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateLastDayDeliverySchedule,
  formatDateSaoPauloBR,
  getSaoPauloDateKey,
} from "../src/utils/deliverySchedule.ts";
import {
  buildSharedDeliveryStops,
  cleanBrazilianAddress,
  interpolateAlongRoute,
  interpolateAlongRouteWithPrefix,
} from "../src/utils/trackingGeo.ts";
import {
  buildWhiteLabelAutomatedTimeline,
  resolveEffectiveCarrierName,
  resolveNearestCarrierCd,
} from "../src/utils/whiteLabelTracking.ts";
import { fetchCepData } from "../src/utils/cepService.ts";

const ESTIMATED_ISO = "2025-03-19T13:30:00+00:00";

function brt(hhmmss) {
  return new Date(`2025-03-19T${hhmmss}-03:00`);
}

test("getSaoPauloDateKey & formatDateSaoPauloBR preserve BRT calendar date", () => {
  assert.equal(getSaoPauloDateKey(ESTIMATED_ISO), "2025-03-19");
  assert.equal(formatDateSaoPauloBR(ESTIMATED_ISO), "19/03/2025");
  assert.equal(formatDateSaoPauloBR("2025-03-19"), "19/03/2025");
});

test("last-day hourly schedule transitions across 18:30 -> 19:00 -> 20:00 -> 21:00..21:30 -> 21:31+", () => {
  const s1830 = evaluateLastDayDeliverySchedule({
    now: brt("18:30:00"),
    statusLabel: "Objeto postado",
    estimatedDeliveryAt: ESTIMATED_ISO,
  });
  assert.equal(s1830.isOutForDeliveryLastDay, true);
  assert.equal(s1830.phase, "en_route");
  assert.ok(s1830.routeProgress >= 0.18 && s1830.routeProgress <= 0.48);

  const s1900 = evaluateLastDayDeliverySchedule({
    now: brt("19:00:00"),
    statusLabel: "Em transporte",
    estimatedDeliveryAt: ESTIMATED_ISO,
  });
  assert.equal(s1900.phase, "arriving");
  assert.match(s1900.headline.toLowerCase(), /começa a chegar/);
  assert.ok(s1900.routeProgress >= 0.45);

  const s1930 = evaluateLastDayDeliverySchedule({
    now: brt("19:30:00"),
    statusLabel: "Saiu para Entrega",
    estimatedDeliveryAt: ESTIMATED_ISO,
  });
  assert.equal(s1930.phase, "arriving");
  assert.ok(s1930.routeProgress > s1900.routeProgress);

  const s2000 = evaluateLastDayDeliverySchedule({
    now: brt("20:00:00"),
    statusLabel: "Saiu para Entrega",
    estimatedDeliveryAt: ESTIMATED_ISO,
  });
  assert.equal(s2000.phase, "nearby");
  assert.match(s2000.headline.toLowerCase(), /está próximo/);
  assert.ok(s2000.routeProgress >= 0.72);

  const s2045 = evaluateLastDayDeliverySchedule({
    now: brt("20:45:00"),
    statusLabel: "Saiu para Entrega",
    estimatedDeliveryAt: ESTIMATED_ISO,
  });
  assert.equal(s2045.phase, "nearby");
  assert.ok(s2045.routeProgress > s2000.routeProgress);

  const s2100 = evaluateLastDayDeliverySchedule({
    now: brt("21:00:00"),
    statusLabel: "Saiu para Entrega",
    estimatedDeliveryAt: ESTIMATED_ISO,
  });
  assert.equal(s2100.phase, "arrived");
  assert.equal(s2100.headline.toLowerCase(), "seu pedido chegou");
  assert.equal(s2100.routeProgress, 0.97);
  assert.equal(s2100.keepEstimatedDeliveryUnchanged, false);

  const s2115 = evaluateLastDayDeliverySchedule({
    now: brt("21:15:00"),
    statusLabel: "Saiu para Entrega",
    estimatedDeliveryAt: ESTIMATED_ISO,
  });
  assert.equal(s2115.phase, "arrived");
  assert.equal(s2115.headline.toLowerCase(), "seu pedido chegou");

  // Exactly 30 minutes after 21:00 stays arrived
  const s2130 = evaluateLastDayDeliverySchedule({
    now: brt("21:30:00"),
    statusLabel: "Saiu para Entrega",
    estimatedDeliveryAt: ESTIMATED_ISO,
  });
  assert.equal(s2130.phase, "arrived");
  assert.equal(s2130.headline.toLowerCase(), "seu pedido chegou");

  // After 30 minutes (21:31 and 22:00) -> reschedule while keeping estimatedDeliveryAt unchanged
  const s2131 = evaluateLastDayDeliverySchedule({
    now: brt("21:31:00"),
    statusLabel: "Saiu para Entrega",
    estimatedDeliveryAt: ESTIMATED_ISO,
  });
  assert.equal(s2131.phase, "reschedule");
  assert.equal(
    s2131.headline.toLowerCase(),
    "seu pedido será remarcado para outra data"
  );
  assert.equal(s2131.keepEstimatedDeliveryUnchanged, true);
  assert.equal(formatDateSaoPauloBR(ESTIMATED_ISO), "19/03/2025");

  const s2200 = evaluateLastDayDeliverySchedule({
    now: brt("22:00:00"),
    statusLabel: "Saiu para Entrega",
    estimatedDeliveryAt: ESTIMATED_ISO,
  });
  assert.equal(s2200.phase, "reschedule");
  assert.equal(s2200.keepEstimatedDeliveryUnchanged, true);
});

test("non-last-day and delivered orders do not activate last-day schedule", () => {
  const pastOrderNotOut = evaluateLastDayDeliverySchedule({
    now: new Date("2026-11-17T20:00:00-03:00"),
    statusLabel: "Objeto postado",
    estimatedDeliveryAt: ESTIMATED_ISO,
  });
  assert.equal(pastOrderNotOut.isOutForDeliveryLastDay, false);
  assert.equal(pastOrderNotOut.phase, "inactive");

  const deliveredOrder = evaluateLastDayDeliverySchedule({
    now: brt("20:30:00"),
    statusLabel: "Entregue",
    estimatedDeliveryAt: ESTIMATED_ISO,
    deliveredAt: "2025-03-18T17:52:51+00:00",
  });
  assert.equal(deliveredOrder.isOutForDeliveryLastDay, false);
  assert.equal(deliveredOrder.phase, "inactive");
});

test("cleanBrazilianAddress strips parenthetical remarks and extracts CEP/UF/city", () => {
  const res1 = cleanBrazilianAddress(
    "Rua Victor Sanches Dumont, 270 - Céu Azul, Belo Horizonte - MG, 31580-170 (próximo a praça da Madonna ou sítio do tele)",
    "31580-170"
  );
  assert.equal(res1.hasStreetInfo, true);
  assert.equal(res1.cep, "31580-170");
  assert.equal(res1.uf, "MG");
  assert.equal(res1.city, "Belo Horizonte");
  assert.ok(!res1.cleaned.includes("Madonna"));
  assert.ok(res1.cleaned.includes("31580-170"));
  assert.ok(!res1.cleaned.includes("31580, 170"));

  const res2 = cleanBrazilianAddress("(Cliente vai enviar a localização)", null);
  assert.equal(res2.hasStreetInfo, false);
  assert.equal(res2.cleaned, "");
});

test("cleanBrazilianAddress preserves N/No in Brazilian place names and strips genuine number prefixes", () => {
  const santoAntonio = cleanBrazilianAddress(
    "R. Profa. Maria Lucas, 74, Santo Antônio - Viçosa, MG, 36576-060 (lado direiro auto socorro João Rossi).",
    null
  );
  assert.equal(santoAntonio.neighborhood, "Santo Antônio");
  assert.equal(santoAntonio.city, "Viçosa");
  assert.equal(santoAntonio.uf, "MG");
  assert.equal(santoAntonio.cep, "36576-060");
  assert.ok(santoAntonio.cleaned.includes("Santo Antônio"));
  assert.ok(santoAntonio.cleaned.includes("36576-060"));

  const novaLima = cleanBrazilianAddress("Rua Nova Lima, 50 - Centro, Belo Horizonte - MG");
  assert.equal(novaLima.street, "Rua Nova Lima");
  assert.ok(novaLima.cleaned.startsWith("Rua Nova Lima, 50"));

  const nossaSenhora = cleanBrazilianAddress("Av. Nossa Senhora do Carmo, 100 - Belo Horizonte - MG");
  assert.equal(nossaSenhora.street, "Av. Nossa Senhora do Carmo");
  assert.ok(nossaSenhora.cleaned.startsWith("Av. Nossa Senhora do Carmo, 100"));

  const natal = cleanBrazilianAddress("Rua das Nações, 50 - Natal - RN");
  assert.equal(natal.street, "Rua das Nações");
  assert.equal(natal.city, "Natal");
  assert.equal(natal.uf, "RN");

  const niteroi = cleanBrazilianAddress("Av. Ernani do Amaral Peixoto, 100 - Centro, Niterói - RJ, 24020-070");
  assert.equal(niteroi.city, "Niterói");
  assert.equal(niteroi.uf, "RJ");
  assert.equal(niteroi.cep, "24020-070");

  const abbrevNs = cleanBrazilianAddress("Rua N. S. das Graças, 10 - Belo Horizonte - MG");
  assert.ok(abbrevNs.cleaned.includes("Rua N. S. das Graças"));

  for (const variant of [
    "Rua das Flores, Nº 42 - Belo Horizonte - MG",
    "Rua das Flores, n° 42 - Belo Horizonte - MG",
    "Rua das Flores, N. 42 - Belo Horizonte - MG",
    "Rua das Flores, n 42 - Belo Horizonte - MG",
    "Rua das Flores, No. 42 - Belo Horizonte - MG",
  ]) {
    const parsed = cleanBrazilianAddress(variant);
    assert.equal(parsed.cleaned, "Rua das Flores, 42, Belo Horizonte, MG");
  }
});

test("cleanBrazilianAddress parses Cidade/UF and Cidade / UF slash notation", () => {
  const slashTight = cleanBrazilianAddress("Rua das Flores, 100 - Centro, Belo Horizonte/MG");
  assert.equal(slashTight.uf, "MG");
  assert.equal(slashTight.city, "Belo Horizonte");
  assert.equal(slashTight.neighborhood, "Centro");

  const slashSpaced = cleanBrazilianAddress("Belo Horizonte / MG");
  assert.equal(slashSpaced.uf, "MG");
  assert.equal(slashSpaced.city, "Belo Horizonte");
});

test("interpolateAlongRoute computes monotonic positions along street polyline", () => {
  const route = [
    [-19.93, -43.95],
    [-19.92, -43.94],
    [-19.91, -43.93],
  ];
  const p0 = interpolateAlongRoute(route, 0);
  const p50 = interpolateAlongRoute(route, 0.5);
  const p97 = interpolateAlongRoute(route, 0.97);
  const p100 = interpolateAlongRoute(route, 1);

  assert.deepEqual(p0, route[0]);
  assert.deepEqual(p100, route[2]);
  assert.ok(p50[0] > p0[0] && p50[0] < p100[0]);
  assert.ok(p97[0] > p50[0] && p97[0] < p100[0]);
});

test("interpolateAlongRouteWithPrefix aligns traveledPath by Haversine distance on uneven vertices", () => {
  // Segment 0->1 is ~15km; segments 1->2 and 2->3 are ~0.1km each
  const unevenRoute = [
    [-19.95, -43.95],
    [-19.85, -43.85],
    [-19.8495, -43.8495],
    [-19.849, -43.849],
  ];

  // At 50% of Haversine distance, marker is still midway along segment 0->1 (must NOT include vertex 1 yet)
  const mid = interpolateAlongRouteWithPrefix(unevenRoute, 0.5);
  assert.equal(mid.traveledPath.length, 2);
  assert.deepEqual(mid.traveledPath[0], unevenRoute[0]);
  assert.deepEqual(mid.traveledPath[1], mid.coord);
  assert.ok(mid.coord[0] < unevenRoute[1][0]);

  // At 99.6% of Haversine distance, marker has passed vertex 1 and 2
  const nearEnd = interpolateAlongRouteWithPrefix(unevenRoute, 0.996);
  assert.ok(nearEnd.traveledPath.length >= 3);
  assert.deepEqual(nearEnd.traveledPath[nearEnd.traveledPath.length - 1], nearEnd.coord);

  assert.deepEqual(interpolateAlongRouteWithPrefix(unevenRoute, 0).traveledPath, [unevenRoute[0]]);
  assert.deepEqual(interpolateAlongRouteWithPrefix(unevenRoute, 1).traveledPath, unevenRoute);
});

test("fetchCepData enforces AbortController timeout and external AbortSignal", async () => {
  const originalFetch = globalThis.fetch;
  try {
    let fetchCalled = false;
    globalThis.fetch = (_url, init) => {
      fetchCalled = true;
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const err = new Error("Aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    };

    const timedOut = await fetchCepData("31580-170", undefined, 25);
    assert.equal(fetchCalled, true);
    assert.equal(timedOut, null);

    fetchCalled = false;
    const preAborted = new AbortController();
    preAborted.abort();
    const abortedResult = await fetchCepData("31580-170", preAborted.signal, 500);
    assert.equal(fetchCalled, false);
    assert.equal(abortedResult, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("non-delivered orders outside last-day stay actively in shared route with other deliveries", () => {
  const activeShared = evaluateLastDayDeliverySchedule({
    now: new Date("2026-11-17T14:25:00-03:00"),
    statusLabel: "Objeto postado",
    estimatedDeliveryAt: ESTIMATED_ISO,
  });
  assert.equal(activeShared.isOutForDeliveryLastDay, false);
  assert.equal(activeShared.phase, "inactive");
  assert.equal(activeShared.headline, "Em rota na região");
  assert.match(activeShared.subtext, /junto com outras entregas/i);
  assert.ok(
    activeShared.routeProgress >= 0.28 && activeShared.routeProgress <= 0.65,
    `expected active shared routeProgress in [0.28, 0.65], got ${activeShared.routeProgress}`
  );
});

test("buildSharedDeliveryStops varies stop count (2..6) and stop locations on each tracking generation", () => {
  const cd = { lat: -19.839, lon: -43.998 };
  const dest = { lat: -19.812, lon: -43.978 };
  const dLat = dest.lat - cd.lat;
  const dLon = dest.lon - cd.lon;

  const observedCounts = new Set();
  const observedFirstStopCoords = new Set();

  for (let run = 0; run < 25; run++) {
    const stops = buildSharedDeliveryStops(cd, dest);
    assert.ok(
      stops.length >= 2 && stops.length <= 6,
      `expected stop count in [2, 6], got ${stops.length}`
    );
    observedCounts.add(stops.length);
    observedFirstStopCoords.add(`${stops[0].lat.toFixed(5)},${stops[0].lon.toFixed(5)}`);

    for (let i = 0; i < stops.length; i++) {
      assert.equal(stops[i].label, "Outra Entrega");
      const crossProduct = Math.abs(
        (stops[i].lat - cd.lat) * dLon - (stops[i].lon - cd.lon) * dLat
      );
      assert.ok(crossProduct > 1e-5, `expected stop ${stops[i].label} to be off-axis`);
    }
  }

  assert.ok(
    observedCounts.size >= 3,
    `expected varied stop counts across generations, got ${[...observedCounts].join(",")}`
  );
  assert.ok(
    observedFirstStopCoords.size >= 20,
    `expected varied stop coordinates across generations, got ${observedFirstStopCoords.size}`
  );
});

test("White-Label tracking defaults unconfirmed carrier to Jadlog and selects nearest real CD", () => {
  assert.equal(resolveEffectiveCarrierName(null), "Jadlog");
  assert.equal(resolveEffectiveCarrierName("Logística Nacional"), "Jadlog");
  assert.equal(resolveEffectiveCarrierName("Correios"), "Correios");
  assert.equal(
    resolveEffectiveCarrierName("", { defaultCarrierName: "Braspress" }),
    "Braspress"
  );

  const bhCd = resolveNearestCarrierCd({
    destination: { lat: -19.812, lon: -43.978, uf: "MG" },
    carrierName: null,
  });
  assert.equal(bhCd.carrierName, "Jadlog");
  assert.equal(bhCd.city, "Contagem");

  const spCd = resolveNearestCarrierCd({
    destination: { lat: -23.5505, lon: -46.6333, uf: "SP" },
    carrierName: "Jadlog",
  });
  assert.equal(spCd.city, "São Paulo");

  const schedule = evaluateLastDayDeliverySchedule({
    now: new Date("2026-11-17T14:25:00-03:00"),
    statusLabel: "Em trânsito",
    estimatedDeliveryAt: "2026-11-19T12:00:00-03:00",
  });

  const timeline = buildWhiteLabelAutomatedTimeline({
    existingTimeline: [],
    postedAt: "2026-11-14T10:00:00-03:00",
    estimatedDeliveryAt: "2026-11-19T12:00:00-03:00",
    now: new Date("2026-11-17T14:25:00-03:00"),
    originStoreName: "Loja Matriz White-Label",
    originStoreAddress: "Av. Amazonas, 1200 - Belo Horizonte, MG",
    carrierName: bhCd.carrierName,
    nearestCd: bhCd,
    schedule,
  });
  assert.ok(timeline.length >= 3);
  assert.ok(timeline.some((e) => /Expedido da Loja/i.test(e.title)));
  assert.ok(timeline.some((e) => /Centro de Distribuição Jadlog/i.test(e.title)));
  assert.ok(timeline.some((e) => /Trânsito Regional/i.test(e.title)));
});
