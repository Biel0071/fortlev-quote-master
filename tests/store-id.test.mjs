import test from "node:test";
import assert from "node:assert/strict";
import { isDatabaseStoreId } from "../src/utils/storeId.ts";

test("accepts UUIDs for database store queries", () => {
  assert.equal(isDatabaseStoreId("123e4567-e89b-42d3-a456-426614174000"), true);
});

test("rejects malformed and local fallback IDs", () => {
  assert.equal(isDatabaseStoreId("f5e69cd7-e-b465-4024-9b99-d388262b08fa"), false);
  assert.equal(isDatabaseStoreId("fortlev-store-id-default"), false);
  assert.equal(isDatabaseStoreId(null), false);
});
