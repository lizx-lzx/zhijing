import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "../../node_modules/playwright/index.mjs";
import { config } from "../../server/config.mjs";

const url = process.env.ZH_PREVIEW_URL || "http://127.0.0.1:4360/";
const timing = JSON.parse(
  await fs.readFile(new URL("./timing.json", import.meta.url)),
);
const browser = await chromium.launch({
  executablePath: config.chromium,
  headless: true,
});
await fs.mkdir(new URL("./render/", import.meta.url), { recursive: true });
const failures = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1050 },
  });
  page.on("pageerror", (e) => failures.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`);
  });
  await page.goto(url, { waitUntil: "networkidle" });
  const video = page.locator("video");
  await page.waitForFunction(
    () => document.querySelector("video")?.readyState >= 1,
  );
  const duration = await video.evaluate((v) => v.duration);
  assert.ok(Math.abs(duration - timing.duration) < 0.5);
  await video.evaluate((v) => {
    v.muted = true;
    return v.play();
  });
  await page.waitForFunction(
    () => document.querySelector("video").currentTime > 1,
  );
  await video.evaluate((v) => v.pause());
  await page.locator(".chapter").nth(2).click();
  const thirdStart = timing.segments.find((s) => s.scene === 2).start;
  await page.waitForFunction(
    (at) => Math.abs(document.querySelector("video").currentTime - at) < 0.3,
    thirdStart,
  );
  await page.getByRole("button", { name: "逐页看图", exact: true }).click();
  assert.equal(
    await page.locator(".slide-controls > span").innerText(),
    "3 / 4",
  );
  await page.getByRole("button", { name: "上一页", exact: true }).click();
  assert.equal(
    await page.locator(".slide-controls > span").innerText(),
    "2 / 4",
  );
  await page.getByRole("button", { name: "下一页", exact: true }).click();
  assert.equal(
    await page.locator(".slide-controls > span").innerText(),
    "3 / 4",
  );
  await page.waitForFunction(
    () => document.querySelector("audio")?.readyState >= 1,
  );
  await page.locator("audio").evaluate((a) => {
    a.muted = true;
    return a.play();
  });
  await page.waitForFunction(
    (at) => document.querySelector("audio").currentTime > at + 0.5,
    thirdStart,
  );
  await page.getByRole("button", { name: "观看讲解", exact: true }).click();
  await page.waitForFunction(
    () => document.querySelector("video")?.readyState >= 1,
  );
  assert.ok((await video.evaluate((v) => v.currentTime)) >= thirdStart);
  await page.screenshot({
    path: fileURLToPath(new URL("./render/desktop-video.png", import.meta.url)),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.getByRole("button", { name: "逐页看图", exact: true }).click();
  await page.locator("summary").filter({ hasText: "完整讲稿" }).click();
  assert.ok(await page.locator(".reading-body").first().isVisible());
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: fileURLToPath(new URL("./render/mobile.png", import.meta.url)),
    fullPage: true,
  });
  assert.equal(await page.getByRole("alert").count(), 0);
  assert.deepEqual(failures, []);
  const proof = {
    checkedAt: new Date().toISOString(),
    url,
    duration,
    desktop: "1440x1050",
    mobile: "390x844",
    videoPlayback: true,
    audioPlayback: true,
    chapterSeek: true,
    slideNavigation: true,
    modeTimePreserved: true,
    mobileOverflow: false,
    pageErrors: failures,
  };
  await fs.writeFile(
    new URL("./render/acceptance.json", import.meta.url),
    JSON.stringify(proof, null, 2),
  );
  console.log(JSON.stringify(proof, null, 2));
} finally {
  await browser.close();
}
