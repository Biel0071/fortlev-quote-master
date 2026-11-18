import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAiGatewayUrl, generateImageBytes } from "../supabase/functions/_shared/aiGateway.ts";

describe("buildAiGatewayUrl", () => {
  it("adds the v1 route to a base API URL", () => {
    assert.equal(
      buildAiGatewayUrl("https://api.example.com", "/v1/chat/completions"),
      "https://api.example.com/v1/chat/completions",
    );
  });

  it("does not duplicate v1 when the base URL already includes it", () => {
    assert.equal(
      buildAiGatewayUrl("https://api.example.com/v1/", "chat/completions"),
      "https://api.example.com/v1/chat/completions",
    );
  });

  it("supports the image-generation route", () => {
    assert.equal(
      buildAiGatewayUrl("https://api.example.com", "/v1/image"),
      "https://api.example.com/v1/image",
    );
  });

  it("decodes image bytes returned by the configured gateway", async () => {
    const originalDeno = globalThis.Deno;
    const originalFetch = globalThis.fetch;
    let request;

    globalThis.Deno = {
      env: {
        get(name) {
          return name === "AI_GATEWAY_URL"
            ? "https://api.example.com"
            : name === "AI_GATEWAY_API_KEY"
              ? "test-key"
              : undefined;
        },
      },
    };
    globalThis.fetch = async (url, options) => {
      request = { url: String(url), options };
      return new Response(JSON.stringify({ result: { images: [{ base64: "AQID" }] } }), {
        headers: { "Content-Type": "application/json" },
      });
    };

    try {
      const bytes = await generateImageBytes("test prompt", { width: 512, height: 512 });
      assert.deepEqual([...bytes], [1, 2, 3]);
      assert.equal(request.url, "https://api.example.com/v1/image");
      assert.equal(request.options.headers.Authorization, "Bearer test-key");
      assert.deepEqual(JSON.parse(request.options.body), {
        prompt: "test prompt",
        wait: true,
        width: 512,
        height: 512,
      });
    } finally {
      globalThis.fetch = originalFetch;
      if (originalDeno === undefined) delete globalThis.Deno;
      else globalThis.Deno = originalDeno;
    }
  });
});
