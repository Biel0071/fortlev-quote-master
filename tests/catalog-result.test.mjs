import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chooseCatalogProducts, describeCatalogError } from "../src/modules/catalog/catalogResult.ts";
import { resolveVerifiedCartPrice } from "../src/modules/catalog/cartPrice.ts";
import { getImageRetryUpdates } from "../src/modules/catalog/imageRecovery.ts";

describe("chooseCatalogProducts", () => {
  it("keeps an empty catalog when the database successfully returns no rows", () => {
    const fallback = [{ id: "cimento", name: "Cimento original" }];

    assert.deepEqual(chooseCatalogProducts([], fallback), []);
  });

  it("keeps database products when rows are available", () => {
    const remote = [{ id: "remote", name: "Produto cadastrado" }];
    const fallback = [{ id: "local", name: "Produto local" }];

    assert.equal(chooseCatalogProducts(remote, fallback), remote);
  });

  it("uses the local catalog when the remote result is missing", () => {
    const fallback = [{ id: "local", name: "Produto local" }];

    assert.equal(chooseCatalogProducts(null, fallback), fallback);
  });
});

describe("describeCatalogError", () => {
  it("identifies database permission errors", () => {
    assert.match(describeCatalogError({ code: "42501", message: "permission denied" }), /Sem permissão/);
  });

  it("identifies network errors without exposing query details", () => {
    assert.match(describeCatalogError(new TypeError("fetch failed")), /Banco indisponível/);
  });
});

describe("resolveVerifiedCartPrice", () => {
  it("does not reuse a local snapshot when the product is missing from the database", () => {
    assert.equal(resolveVerifiedCartPrice(null), null);
  });

  it("uses a valid database promotion and otherwise uses the database price", () => {
    assert.equal(resolveVerifiedCartPrice({ price: 100, promo_price: 85 }), 85);
    assert.equal(resolveVerifiedCartPrice({ price: 100, promo_price: 120 }), 100);
  });

  it("rejects zero or invalid database prices", () => {
    assert.equal(resolveVerifiedCartPrice({ price: 0 }), null);
    assert.equal(resolveVerifiedCartPrice({ price: "invalid" }), null);
  });
});

describe("getImageRetryUpdates", () => {
  it("queues only products without images and never changes active state", () => {
    const products = [
      { id: "missing", active: false, status: "no_image_found" },
      { id: "has-image", active: true, status: "no_image_found" },
      { id: "not-retryable", active: false, status: "draft" },
    ];

    assert.deepEqual(getImageRetryUpdates(products, new Set(["has-image"])), [
      { id: "missing", status: "import_pending" },
    ]);
    assert.equal(products[0].active, false);
  });
});
