import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "../../node_modules/playwright/index.mjs";
import { config } from "../../server/config.mjs";
import { editionPaths } from "./paths.mjs";
const { root } = editionPaths();
const lesson = JSON.parse(await fs.readFile(new URL("lesson.json", root)));
const count = lesson.scenes.length;

const url = process.env.ZH_PREVIEW_URL || "http://127.0.0.1:4360/";
const timing = JSON.parse(await fs.readFile(new URL("timing.json", root)));
const browser = await chromium.launch({
  executablePath: config.chromium,
  headless: true,
});
await fs.mkdir(new URL("render/", root), { recursive: true });
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
    `3 / ${count}`,
  );
  await page.getByRole("button", { name: "上一页", exact: true }).click();
  assert.equal(
    await page.locator(".slide-controls > span").innerText(),
    `2 / ${count}`,
  );
  await page.getByRole("button", { name: "下一页", exact: true }).click();
  assert.equal(
    await page.locator(".slide-controls > span").innerText(),
    `3 / ${count}`,
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
    path: fileURLToPath(new URL("render/desktop-video.png", root)),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.getByRole("button", { name: "逐页看图", exact: true }).click();
  const transcript = page.locator("summary").filter({ hasText: "完整讲稿" });
  await transcript.click();
  assert.ok(
    await transcript.locator("..").locator(".reading-body").isVisible(),
  );
  await transcript.click();
  await page.getByRole("button", { name: "只听音频", exact: true }).click();
  await page.waitForFunction(
    () => document.querySelector("audio")?.readyState >= 1,
  );
  assert.ok(await page.locator(".audio-view").isVisible());
  await page.getByRole("button", { name: "文字梳理", exact: true }).click();
  assert.equal(await page.locator(".reading-chapter").count(), count);
  if (lesson.sourceMeta) {
    assert.match(await page.locator("h1").innerText(), /窗口期/);
    assert.ok(!(await page.locator("body").innerText()).includes("人均六本"));
    await page.locator("summary").filter({ hasText: "哪些是事实" }).click();
    assert.equal(await page.locator(".claim-check").count(), 4);
    await page.locator("summary").filter({ hasText: "三个小问题" }).click();
    assert.equal(await page.locator(".self-check").count(), 3);
    const answer = page.getByText("查看参考理解", { exact: true }).first();
    await answer.click();
    assert.ok(await answer.locator("..").locator("p").isVisible());
    for (const href of await page
      .locator("a[download]")
      .evaluateAll((links) => links.map((l) => l.href))) {
      assert.equal(new URL(href).origin, new URL(url).origin);
      const response = await page.request.head(href);
      assert.equal(response.status(), 200, href);
    }
  }
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: fileURLToPath(new URL("render/mobile.png", root)),
    fullPage: false,
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
    fullReadingChapters: count,
    standaloneAudio: true,
    mobileOverflow: false,
    pageErrors: failures,
  };
  await fs.writeFile(
    new URL("render/acceptance.json", root),
    JSON.stringify(proof, null, 2),
  );
  console.log(JSON.stringify(proof, null, 2));
} finally {
  await browser.close();
}
