// Isolated browser verification: API responses are mocked; no provider calls.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { buildProfile } from "../lib/domain.ts";

const url = process.env.ZH_UI_URL;
if (!url || !new URL(url).hostname.match(/^(localhost|127\.0\.0\.1)$/))
  throw new Error("Set ZH_UI_URL to a local preview");
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/api/**", (route) =>
      route.fulfill({
        json: {
          profile: buildProfile({ primary: "video" }),
          lessons: [],
          hasRecovery: false,
        },
      }),
    );
    await page.goto(url);
    await page.getByText("这次读法：", { exact: false }).click();
    const primary = page.getByRole("combobox", { name: "主要形式" });
    await page.getByRole("button", { name: "展开选择学习形式" }).click();
    const modes = page.getByRole("group", {
      name: "选择学习形式",
      exact: true,
    });
    const video = modes.getByRole("checkbox", { name: /视频/ });
    const reading = modes.getByRole("checkbox", { name: /图文/ });
    const audio = modes.getByRole("checkbox", { name: /音频/ });
    const all = page.getByRole("checkbox", {
      name: "体验全部形式",
      exact: true,
    });
    const start = page.getByRole("button", { name: "开始体验" });
    await page.getByRole("textbox", { name: "文章链接" }).fill("演示联动测试");
    assert.equal(await video.isEnabled(), true);
    await video.uncheck();
    assert.equal(await primary.inputValue(), "");
    assert.equal(await start.isDisabled(), true);
    await reading.check();
    assert.equal(await primary.inputValue(), "reading");
    assert.equal(await start.isEnabled(), true);
    await primary.selectOption("audio");
    assert.equal(await audio.isChecked(), true);
    assert.equal(await reading.isChecked(), false);
    await video.check();
    await audio.uncheck();
    assert.equal(await primary.inputValue(), "video");
    await all.check();
    assert.equal(await modes.locator("input:checked").count(), 6);
    await video.uncheck();
    assert.notEqual(await primary.inputValue(), "video");
    assert.equal(await all.evaluate((el) => el.indeterminate), true);
    await all.check();
    await all.uncheck();
    assert.equal(await modes.locator("input:checked").count(), 0);
    assert.equal(await start.isDisabled(), true);
    await reading.check();
    let destination;
    await page.route("**/demo/zhihu-window-20260908/**", (route) => {
      destination = new URL(route.request().url());
      return route.fulfill({
        contentType: "text/html",
        body: "<p>Destination verified</p>",
      });
    });
    await start.click();
    await page.getByText("Destination verified").waitFor();
    assert.equal(destination.searchParams.get("mode"), "reading");
    assert.equal(destination.searchParams.get("formats"), "reading");
    assert.deepEqual(errors, []);
    console.log(
      `PASS ${viewport.width}px: deselect, fallback, primary switch, all/none, partial state, destination`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
