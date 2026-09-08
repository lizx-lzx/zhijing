// Explicit release smoke: one fresh private visitor, one real AI Skill and
// one reading-only sample lesson. This incurs model usage, but no video / TTS.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";
const url = process.env.ZH_PUBLIC_UI_URL;
if (!url?.startsWith("https://"))
  throw new Error("Set ZH_PUBLIC_UI_URL to the intended HTTPS website");
const out = "test-results/platform-public";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 960 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.goto(url);
  await page.getByRole("button", { name: "找到我的学法" }).click();
  for (let step = 0; step < 7; step++) {
    if (step === 2)
      await page
        .locator(".z-choice")
        .filter({ has: page.getByText("图文", { exact: true }) })
        .click();
    await page.getByRole("button", { name: "下一步", exact: true }).click();
  }
  console.log("Public UI: generating a real reading-first Skill");
  const designedResponse = page.waitForResponse(
    (r) => r.url().endsWith("/profile/design"),
    { timeout: 180000 },
  );
  await page.getByRole("button", { name: "生成我的学习方式" }).click();
  const designed = await (await designedResponse).json();
  assert.equal(designed.profile?.engine, "ai");
  await page.getByRole("heading", { name: "你的学法，准备好了" }).waitFor();
  await page.getByRole("button", { name: "保存并开始学习" }).click();
  await page.getByRole("heading", { name: "今天想读懂什么？" }).waitFor();
  console.log("Public UI: submitting one real reading-only sample");
  const submittedResponse = page.waitForResponse(
    (r) => r.url().endsWith("/lessons") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "为我制作这篇" }).click();
  const submitted = await (await submittedResponse).json();
  assert.deepEqual(submitted.lesson?.formats, ["reading"]);
  await page
    .locator(".z-reading .z-chapter")
    .first()
    .waitFor({ timeout: 240000 });
  await page
    .locator(".z-job-progress")
    .waitFor({ state: "detached", timeout: 60000 });
  const lessonResponse = await context.request.get(
    new URL(`api/lessons/${submitted.lesson.id}`, url).href,
  );
  const { lesson } = await lessonResponse.json();
  assert.equal(lesson.status, "ready");
  assert.ok(lesson.result.chapters.length > 0);
  await page.screenshot({
    path: `${out}/real-reading-desktop.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "查看对应原文" }).first().click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  await page.reload();
  await page.locator(".z-reading .z-chapter").first().waitFor();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "学习库" })
    .click();
  await page.locator(".z-lesson-card").first().click();
  await page.locator(".z-reading .z-chapter").first().waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: `${out}/real-reading-mobile.png`,
    fullPage: true,
  });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  assert.deepEqual(errors, []);
  const report = {
    url,
    at: new Date().toISOString(),
    passed: true,
    profileEngine: designed.profile.engine,
    lessonId: lesson.id,
    status: lesson.status,
    formats: lesson.formats,
    chapters: lesson.result.chapters.length,
    checks: [
      "real questionnaire to AI Skill",
      "confirmed save",
      "real sample generation",
      "source dialog",
      "reload persistence",
      "library reopen",
      "mobile reading",
    ],
    boundary:
      "Fresh isolated visitor; no existing user changes; reading only; not a learning efficacy test",
  };
  await fs.writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} catch (error) {
  await page.screenshot({ path: `${out}/failure.png`, fullPage: true });
  throw error;
} finally {
  await context.close();
  await browser.close();
}
