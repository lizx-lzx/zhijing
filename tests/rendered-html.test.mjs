import assert from "node:assert/strict";
import test from "node:test";
test("production worker renders the Chinese application shell, not the old fixed case", async () => {
  const { default: worker } = await import("../dist/server/index.js");
  const response = await worker.fetch(
    new Request("http://localhost/"),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<html lang="zh-CN">/);
  assert.match(html, /知径/);
  assert.match(html, /正在打开知径/);
  assert.doesNotMatch(
    html,
    /Your site is taking shape|窗口期可能只剩五年|Bearer sk-/,
  );
});
