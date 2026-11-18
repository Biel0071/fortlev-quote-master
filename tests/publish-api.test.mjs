import test from "node:test";
import assert from "node:assert/strict";
import { fetchPublishStatus, startPublish } from "../src/modules/admin/publishing/publishApi.ts";

test("publish status uses the same-origin proxy and bearer session", async () => {
  let observed;
  const fetcher = async (url, init) => {
    observed = { url, init };
    return Response.json({ success: true, configured: true, canPublish: true });
  };

  const result = await fetchPublishStatus("supabase-user-session", fetcher);

  assert.equal(result.canPublish, true);
  assert.equal(observed.url, "/api/store-publish/status");
  assert.equal(observed.init.headers.Authorization, "Bearer supabase-user-session");
});

test("publish requests are idempotency keyed and bind to the reviewed main commit", async () => {
  let observed;
  const input = { requestId: "8b88b9d2-1111-4111-8111-111111111111", expectedSha: "a".repeat(40) };
  const fetcher = async (url, init) => {
    observed = { url, init };
    return Response.json({ success: true, requestId: input.requestId, run: { id: 42 } }, { status: 202 });
  };

  const result = await startPublish("supabase-user-session", input, fetcher);

  assert.equal(result.run.id, 42);
  assert.equal(observed.url, "/api/store-publish/runs");
  assert.equal(observed.init.headers["Idempotency-Key"], input.requestId);
  assert.deepEqual(JSON.parse(observed.init.body), input);
});

test("publish API returns the backend error without disguising a failed preflight", async () => {
  const fetcher = async () => Response.json({
    success: false,
    error: { code: "PUBLISH_IN_PROGRESS", message: "Já existe uma publicação em andamento." },
  }, { status: 409 });

  await assert.rejects(
    fetchPublishStatus("supabase-user-session", fetcher),
    (error) => error.status === 409 && error.code === "PUBLISH_IN_PROGRESS",
  );
});
