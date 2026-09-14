// Local-only browser regression: real UI, mocked API, no model calls or user data.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { buildProfile } from "../lib/domain.ts";

const url = process.env.ZH_UI_URL;
if (!url || !/^(localhost|127\.0\.0\.1)$/.test(new URL(url).hostname))
  throw new Error("Set ZH_UI_URL to a local preview");
const output = new URL("../test-results/ui-copy-review/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 1440 ? 1000 : 844 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    // The case bundle uses the production base path; serve its shared assets locally.
    await page.route("**/zhijing/**", (route) =>
      route.continue({ url: route.request().url().replace("/zhijing/", "/") }),
    );
    await page.route("**/api/**", (route) => {
      const chat = route.request().url().endsWith("/companion/chat");
      return route.fulfill({
        json: chat
          ? {
              messages:
                route.request().method() === "POST"
                  ? [
                      { role: "user", text: "问个问题" },
                      { role: "assistant", text: "我们从这一段开始。" },
                    ]
                  : [],
            }
          : { profile: buildProfile({}), lessons: [], hasRecovery: false },
      });
    });
    const shot = (name) =>
      page.screenshot({
        path: fileURLToPath(new URL(`${width}-${name}.png`, output)),
      });
    await page.goto(`${url}/?start=welcome`);
    await page.getByRole("button", { name: "找到我的学法" }).waitFor();
    assert.equal(await page.getByText("8 题 · 约 2 分钟").count(), 1);
    await shot("welcome");
    await page.getByRole("button", { name: "找到我的学法" }).click();
    await page
      .getByRole("heading", { name: "先告诉我，你的年龄阶段" })
      .waitFor();
    assert.equal(await page.getByText("随时可改").count(), 1);
    assert.equal(
      await page.getByText("仅用于选择表达和例子，不判断能力。").count(),
      0,
    );
    await shot("questionnaire");

    await page.goto(url);
    await page.getByRole("heading", { name: "待启集" }).waitFor();
    assert.equal(
      await page.locator(".z-page-heading p").innerText(),
      "演示模式 · 预置学习作品",
    );
    await page.getByRole("button", { name: "放入正文", exact: true }).click();
    assert.equal(await page.locator(".z-character-count").count(), 0);
    await page
      .getByRole("textbox", { name: "文章正文", exact: true })
      .fill("文".repeat(40000));
    assert.equal(
      await page.locator(".z-character-count").innerText(),
      "40,000 / 45,000 字",
    );
    await page.getByRole("textbox", { name: "文章正文", exact: true }).fill("");
    await shot("workbench");
    await page.getByRole("button", { name: "打开陪读小猫" }).click();
    await page
      .getByRole("button", { name: "怎么开始学习？", exact: true })
      .waitFor();
    assert.equal(await page.locator(".z-pet-scope").count(), 0);
    assert.equal(await page.locator(".z-pet-messages").innerText(), "");
    await shot("companion");
    await page
      .getByRole("button", { name: "怎么开始学习？", exact: true })
      .click();
    await page.getByText("我们从这一段开始。", { exact: true }).waitFor();
    assert.equal(await page.locator(".z-pet-shortcuts").count(), 0);

    await page.goto(
      `${url}/demo/zhihu-window-20260908/?experience=demo&mode=video`,
    );
    await page
      .getByRole("heading", { name: "窗口期可能只剩五年", exact: true })
      .waitFor();
    const modes = page.getByRole("group", { name: "观看方式", exact: true });
    for (const [mode, label] of Object.entries({
      video: "视频",
      slides: "图解",
      audio: "音频",
      reading: "图文",
      overview: "全景图",
      practice: "互动",
    })) {
      await modes.getByRole("button", { name: label, exact: true }).click();
      assert.equal(
        await modes
          .getByRole("button", { name: label, exact: true })
          .getAttribute("aria-pressed"),
        "true",
      );
      const visible = await page.locator("body").innerText();
      assert.doesNotMatch(
        visible,
        /完整有声讲解|完整梳理 ·|可选练习 ·|先想一想，或直接看答案|来源说明/,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
        `${width} ${mode} overflow`,
      );
      assert.equal(
        await page
          .locator(".full-original-text")
          .first()
          .textContent()
          .then((t) => t.length > 10000),
        true,
      );
      await shot(mode);
    }
    assert.deepEqual(errors, []);
    console.log(
      `PASS ${width}px: welcome, questionnaire, workbench, chat, six study modes, source preserved, no overflow`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
