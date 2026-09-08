import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "../../node_modules/playwright/index.mjs";
import { editionPaths } from "./paths.mjs";
const { root } = editionPaths();
const lesson = JSON.parse(await fs.readFile(new URL("lesson.json", root)));
const url = process.env.ZH_PREVIEW_URL || "http://127.0.0.1:4361/";
const browser = await chromium.launch({ headless: true });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
page.on("pageerror", (error) => errors.push(error.message));
page.on("response", (response) => {
  if (response.status() >= 400)
    errors.push(`${response.status()} ${response.url()}`);
});
const box = (selector) => page.locator(selector).boundingBox();
const shot = async (name, fullPage = false) =>
  page.screenshot({
    path: fileURLToPath(new URL(`render/ui-${name}.png`, root)),
    fullPage,
  });
const noOverflow = async () =>
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "page must not overflow",
  );
const choose = async (index) => {
  await page.getByRole("button", { name: "打开章节目录", exact: true }).click();
  await page.locator("dialog .chapter").nth(index).click();
  assert.equal(await page.locator("dialog[open]").count(), 0);
};
try {
  await fs.mkdir(new URL("render/", root), { recursive: true });
  await page.goto(url, { waitUntil: "networkidle" });
  assert.doesNotMatch(await page.locator("body").innerText(), /OpenMAIC/i);
  assert.ok(
    await page.getByRole("link", { name: "开源说明", exact: true }).isVisible(),
  );
  await page.waitForFunction(
    () => document.querySelector("video")?.readyState >= 2,
  );
  const player = await box(".player"),
    chapters = await box(".chapters"),
    supplements = await box(".reading");
  assert.ok(
    chapters.height <= player.height + 3,
    "directory must not stretch video row",
  );
  assert.ok(
    supplements.y - (player.y + player.height) < 145,
    "no directory-induced blank space",
  );
  await shot("desktop", true);
  const settings = page.getByRole("button", {
    name: "示例讲法 ⌄",
    exact: true,
  });
  await settings.click();
  assert.match(await page.locator("dialog").innerText(), /不是对你的测评结果/);
  await page.keyboard.press("Escape");
  assert.ok(
    await settings.evaluate((el) => el === document.activeElement),
    "Escape restores focus",
  );
  await page.getByRole("button", { name: "全屏观看 ⛶", exact: true }).click();
  await page.waitForFunction(() => !!document.fullscreenElement);
  await page.evaluate(() => document.exitFullscreen());

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo(0, 0));
  const mobilePlayer = await box(".player");
  assert.ok(mobilePlayer.y < 310, `mobile video begins at ${mobilePlayer.y}`);
  assert.equal(await page.locator(".chapters").isVisible(), false);
  await noOverflow();
  await shot("mobile-video", true);

  await page.getByRole("button", { name: "文字梳理", exact: true }).click();
  await choose(lesson.scenes.length - 1);
  await page.waitForFunction(() => {
    const y = document
      .querySelector(".reading-chapter:last-child")
      .getBoundingClientRect().top;
    return y >= 100 && y < 190;
  });
  const target = await box(".reading-chapter:last-child");
  assert.ok(
    target.y >= 100 && target.y < 190,
    `chosen heading visible below toolbar: ${target.y}`,
  );
  const trigger = page.getByRole("button", {
    name: "打开章节目录",
    exact: true,
  });
  assert.ok(
    (await trigger.boundingBox()).y < 120,
    "directory stays reachable while reading",
  );
  await page
    .locator(".reading-chapter")
    .nth(2)
    .evaluate((el) => el.scrollIntoView({ block: "start" }));
  await page.waitForFunction(() =>
    document
      .querySelector(".mobile-chapter-trigger")
      .textContent.includes("03 /"),
  );
  await shot("mobile-reading");

  await page.getByRole("button", { name: "逐页看图", exact: true }).click();
  await choose(0);
  if (lesson.scenes[0].diagram) {
    assert.ok(await page.locator(".responsive-diagram").isVisible());
    assert.equal(await page.locator(".landscape-diagram").isVisible(), false);
    const font = await page
      .locator(".diagram-node p")
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    assert.ok(font >= 18);
    await page.waitForFunction(() => {
      const top = document
        .querySelector(".responsive-diagram")
        .getBoundingClientRect().top;
      return top > 0 && top < innerHeight / 2;
    });
    await shot("mobile-diagram");
    for (let i = 0; i < lesson.scenes.length; i++) {
      await choose(i);
      assert.equal(
        await page.locator(".diagram-node").count(),
        lesson.scenes[i].diagram.groups.flat().length,
      );
      assert.equal(
        await page.locator(".diagram-path").count(),
        lesson.scenes[i].diagram.groups.length,
      );
      if (lesson.scenes[i].diagram.layout === "cycle")
        assert.ok(await page.locator(".cycle-return").isVisible());
      await noOverflow();
    }
  }
  await page.getByRole("button", { name: "放大画面", exact: true }).click();
  assert.ok(await page.locator("dialog .canvas").isVisible());
  await noOverflow();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "下载作品 ↓", exact: true }).click();
  const links = page.locator("dialog a[download]");
  assert.equal(
    await links.count(),
    lesson.sourceMeta ? 5 + lesson.scenes.length : 2,
  );
  for (const href of await links.evaluateAll((items) =>
    items.map((a) => a.href),
  ))
    assert.equal((await page.request.head(href)).status(), 200, href);
  await page.keyboard.press("Escape");

  const responsive = [];
  for (const width of [320, 600, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole("button", { name: "观看讲解", exact: true }).click();
    await noOverflow();
    responsive.push(width);
  }
  // Keyboard/text enlargement, not merely a desktop image scaled down.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addStyleTag({ content: ":root { font-size: 32px; }" });
  await noOverflow();
  await page.getByRole("button", { name: "打开章节目录", exact: true }).click();
  await noOverflow();
  await page.keyboard.press("Escape");
  assert.deepEqual(errors, []);
  const proof = {
    checkedAt: new Date().toISOString(),
    url,
    desktopDirectoryHeight: Math.round(chapters.height),
    desktopPlayerHeight: Math.round(player.height),
    desktopSupplementGap: Math.round(supplements.y - player.y - player.height),
    mobileVideoTop: Math.round(mobilePlayer.y),
    readingNavigation: true,
    readingScrollTracking: true,
    dialogEscapeFocus: true,
    videoFullscreen: true,
    allDownloads: true,
    semanticMobileDiagrams: lesson.scenes.filter((s) => s.diagram).length,
    responsiveWidths: responsive,
    textEnlargement200: true,
    errors,
  };
  await fs.writeFile(
    new URL("render/ui-acceptance.json", root),
    JSON.stringify(proof, null, 2),
  );
  console.log(JSON.stringify(proof, null, 2));
} finally {
  await browser.close();
}
