// Read-only HTTP and deployed-byte acceptance, not browser interaction testing.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
const target = process.env.ZH_RELEASE_URL;
if (!target) throw new Error("Specify ZH_RELEASE_URL");
const base = new URL(target);
const response = await fetch(base, {
  headers: { "Cache-Control": "no-cache" },
});
assert.equal(response.status, 200);
const html = await response.text();
assert.ok(html.includes("知径"));
assert.doesNotMatch(html, /×\s*OpenMAIC/);
const assets = [
  ...new Set(
    [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
      .map((m) => m[1])
      .filter((s) => s.includes("/_next/") && /\.(?:js|css)(?:\?|$)/.test(s)),
  ),
];
assert.ok(assets.length > 0, "Main HTML must reference production assets");
const verified = [];
for (const asset of assets) {
  const url = new URL(asset.replaceAll("&amp;", "&"), base);
  assert.equal(url.origin, base.origin);
  const live = await fetch(url);
  assert.equal(live.status, 200);
  const bytes = Buffer.from(await live.arrayBuffer());
  const local = await fs.readFile(
    path.join(process.cwd(), "dist/client", url.pathname),
  );
  const digest = (value) => createHash("sha256").update(value).digest("hex");
  assert.equal(digest(bytes), digest(local));
  verified.push({
    path: url.pathname,
    bytes: bytes.length,
    sha256: digest(bytes),
  });
}
const health = await (await fetch(new URL("api/health", base))).json();
const cover = await fetch(new URL("images/window-cover.jpg", base));
assert.equal(cover.status, 200);
assert.deepEqual(
  Buffer.from(await cover.arrayBuffer()),
  await fs.readFile("public/images/window-cover.jpg"),
);
assert.equal(health.version, "2.0.0");
assert.equal(health.generationConfigured, true);
assert.equal(health.voiceConfigured, true);
for (const demo of ["demo/zhihu-window-20260908/", "demo/openmaic-20260908/"])
  assert.equal((await fetch(new URL(demo, base))).status, 200);
console.log(
  "RELEASE_HTTP_VERIFIED",
  JSON.stringify({
    at: new Date().toISOString(),
    target,
    version: health.version,
    assets: verified,
    legacyDemos: true,
    featuredCover: true,
  }),
);
