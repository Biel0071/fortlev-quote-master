import test from "node:test";
import assert from "node:assert/strict";
import { selectRealOfferProducts } from "../src/hooks/useOfferProducts.ts";

test("only returns real products with a valid promotion stored in the database", () => {
  const products = selectRealOfferProducts([
    { id: "promo", name: "Cimento", price: 30, promo_price: 24, is_promotion: true, active: true },
    { id: "regular", name: "Areia", price: 100, promo_price: 80, is_promotion: false, active: true },
    { id: "invalid", name: "Tijolo", price: 2, promo_price: 4, is_promotion: true, active: true },
  ]);

  assert.equal(products.length, 1);
  assert.equal(products[0].id, "promo");
  assert.equal(products[0].price, 30);
  assert.equal(products[0].promo_price, 24);
  assert.equal(products[0].discountPct, 20);
});

test("does not invent an offer when there are no real promotions", () => {
  assert.deepEqual(selectRealOfferProducts([]), []);
  assert.deepEqual(selectRealOfferProducts([{ id: "p1", price: 30, promo_price: 0 }]), []);
});
