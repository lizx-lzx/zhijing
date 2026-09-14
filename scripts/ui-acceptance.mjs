// Isolated UI fixtures only: this does not call an AI provider or change user data.
// Run against a local dev server: ZH_UI_URL=http://127.0.0.1:4370 node scripts/ui-acceptance.mjs
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";
import { buildProfile } from "../lib/domain.ts";

const origin = process.env.ZH_UI_URL || "http://127.0.0.1:4370";
const basePath = new URL(origin).pathname.replace(/\/$/, "");
const out = process.env.ZH_UI_OUTPUT || "test-results/platform-ui";
await fs.mkdir(out, { recursive: true });
const profile = buildProfile({
  primary: "video",
  extras: ["reading", "audio"],
  entry: "story",
});
const source = {
  id: "ui-source",
  title: "UI 测试：如何读懂一个平均数",
  mode: "sample",
  url: "",
  createdAt: new Date().toISOString(),
  blocks: [
    { id: "intro", text: "这是原文的前文，应保留供读者对照。".repeat(40) },
    {
      id: "p1",
      text: "平均数描述总体，但不能代替每一个人的实际情况。比较数据时，要先问清样本是谁。",
    },
    {
      id: "p2",
      text: "这是另一处相关原文。旧作品只记录了段落关联，没有准确句子。",
    },
    { id: "after", text: "这是原文的后文，不应被过滤或高亮。" },
  ],
};
const content = {
  title: "平均数背后，藏着谁的生活？",
  lead: "先看一个小故事，再把平均数、分布与判断连起来。这是界面验收用的测试内容。",
  adaptation: ["用故事开场，逐步展开关系；这不是能力判断。"],
  chapters: ["先看一个小故事", "平均数不能代替分布", "回到你自己的判断"].map(
    (title, i) => ({
      id: `c${i}`,
      title,
      kind: "解释",
      fictional: i === 0,
      sourceIds: ["p1", "p2"],
      body: "平均数描述总体，但不能代替每一个人的实际情况。\n因此，看到数据时可以先问：它统计了谁？这些人之间的差异有多大？理解数字的边界，才能减少被数字误导的机会。",
      narration: "测试讲解",
      visual: {
        type: "chain",
        relation: "再检查",
        items: [
          { label: "看到数字", detail: "先确认数字描述的是哪一组人。" },
          { label: "了解分布", detail: "看看人与人之间到底相差多少。" },
          { label: "作出判断", detail: "不把总体结论直接套在每个人身上。" },
        ],
      },
    }),
  ),
  takeaways: ["先确认样本，再理解平均数的适用范围。"],
  quiz: [
    {
      question: "看到平均数时，先问什么？",
      options: ["统计了谁", "数字够不够大"],
      correct: 0,
      explanation: "样本不同，数字的意义也会不同。",
      sourceIds: ["p1"],
    },
  ],
};
const ready = {
  id: "ui-ready",
  sourceId: source.id,
  status: "ready",
  stage: "已完成",
  progress: 100,
  title: content.title,
  error: "",
  result: content,
  profile,
  formats: ["video", "reading", "audio"],
  media: {
    status: "ready",
    duration: 409,
    scenes: [
      { start: 0, end: 10 },
      { start: 10, end: 20 },
      { start: 20, end: 409 },
    ],
  },
  createdAt: new Date().toISOString(),
  completed: false,
  source,
};
const pending = {
  ...ready,
  id: "ui-pending",
  title: "正在整理的文章",
  status: "working",
  stage: "正在按你的讲法编排",
  progress: 28,
  result: null,
  media: { status: "pending" },
};
const failed = {
  ...pending,
  id: "ui-failed",
  title: "可以重试的文章",
  status: "failed",
  error: "测试服务暂时不可用，内容和任务仍然保留。",
};
const partial = {
  ...ready,
  id: "ui-partial",
  title: "图文就绪的文章",
  status: "partial",
  media: { status: "failed", error: "测试配音失败，图文已完整保存。" },
};
const browser = await chromium.launch();
const results = [];
async function session(saved = null, initialLessons = []) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  let currentProfile = saved;
  const lessons = structuredClone(initialLessons);
  const writes = [];
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/**", async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname.split("/api")[1];
    const body = req.postDataJSON();
    const json = (data, status = 200) => route.fulfill({ status, json: data });
    if (req.method() !== "GET") writes.push({ path, body });
    if (path === "/me")
      return json({ profile: currentProfile, lessons, hasRecovery: false });
    if (path === "/profile/design")
      return json({ profile: buildProfile(body.answers) });
    if (path === "/profile" && req.method() === "PUT") {
      currentProfile = body.profile;
      return json({ profile: currentProfile });
    }
    if (path === "/profile/versions")
      return json({
        versions: [{ id: "v1", profile, createdAt: ready.createdAt }],
      });
    if (path === "/sources" && body?.url)
      return json({ error: "暂时无法读取此链接。请粘贴文章正文继续。" }, 422);
    if (path.startsWith("/sources")) return json({ source });
    if (path === "/lessons" && req.method() === "GET")
      return json({ lessons, total: lessons.length, nextOffset: null });
    if (path === "/lessons") {
      lessons.unshift(structuredClone(pending));
      return json({ lesson: pending });
    }
    const id = path.split("/")[2],
      lesson = lessons.find((x) => x.id === id) || ready;
    if (/\/lessons\/[^/]+$/.test(path)) return json({ lesson });
    if (path.endsWith("/state")) {
      lesson.studyState = { ...lesson.studyState, ...body };
      return json({ ok: true });
    }
    if (path.endsWith("/retry")) {
      Object.assign(lesson, { ...pending, id: lesson.id });
      return json({ lesson });
    }
    if (path.endsWith("/feedback")) {
      lesson.completed = body.completed;
      return json({ ok: true });
    }
    if (path.includes("/media/"))
      return route.fulfill({
        status: 302,
        headers: {
          location: `${basePath}/demo/zhihu-window-20260908/media/${path.split("/media/")[1]}`,
        },
      });
    if (path.endsWith("/player"))
      return route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><html lang='zh-CN'><body><h1>UI 测试的互动网页</h1></body></html>",
      });
    return json({ ok: true });
  });
  await page.goto(origin);
  await page.getByRole("button", { name: "知径首页" }).waitFor();
  return { context, page, writes, errors };
}
async function snapshot(page, name, widths = [1440, 1024, 768, 390, 320]) {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 960 });
    await page.evaluate(
      () =>
        new Promise((resolve) => {
          window.scrollTo(0, 0);
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        }),
    );
    await page.screenshot({
      path: `${out}/${name}-${width}.png`,
      fullPage: true,
    });
    const dimensions = await page.evaluate(() => ({
      page: document.documentElement.scrollWidth,
      viewport: innerWidth,
    }));
    assert.ok(
      dimensions.page <= dimensions.viewport + 1,
      `${name} overflows at ${width}: ${JSON.stringify(dimensions)}`,
    );
    const nav = page.getByRole("navigation", { name: "主要导航" });
    if (width <= 768 && (await nav.count())) {
      const box = await nav.boundingBox();
      assert.ok(
        box.y + box.height <= 961 && box.y >= 0,
        "mobile navigation remains reachable",
      );
    }
    results.push(`${name} ${width}px: no horizontal overflow`);
  }
  await page.setViewportSize({ width: 390, height: 960 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await page.screenshot({ path: `${out}/${name}-text200.png`, fullPage: true });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    `${name}: 200% text overflow`,
  );
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "";
  });
  await page.setViewportSize({ width: 1440, height: 960 });
}
try {
  const first = await session();
  const { page } = first;
  await snapshot(page, "welcome");
  await page.getByRole("button", { name: "找到我的学法" }).click();
  await snapshot(page, "questionnaire");
  await page.getByRole("button", { name: "22—29 岁" }).click();
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await page.getByRole("button", { name: "上一步" }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "22—29 岁" })
      .getAttribute("aria-pressed"),
    "true",
  );
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await page.getByRole("checkbox", { name: "图文", exact: true }).check();
  await page.getByRole("checkbox", { name: "音频", exact: true }).check();
  for (let i = 2; i < 7; i++)
    await page.getByRole("button", { name: "下一步", exact: true }).click();
  await snapshot(page, "questionnaire-multiple");
  await page.getByRole("button", { name: "生成我的学习方式" }).click();
  await page.getByRole("heading", { name: "你的学法，准备好了" }).waitFor();
  await snapshot(page, "skill-first");
  assert.equal(
    first.writes.find((x) => x.path === "/profile/design").body.answers.age,
    "22-29",
  );
  assert.deepEqual(
    first.writes.find((x) => x.path === "/profile/design").body.answers.extras,
    ["reading", "audio"],
  );
  await page.getByRole("button", { name: "保存并开始学习" }).click();
  await snapshot(page, "workspace-empty");
  await page.locator(".z-temporary > summary").click();
  assert.equal(await page.locator(".z-temporary").getAttribute("open"), "");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "知藏" })
    .click();
  await snapshot(page, "library-empty");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "读法笺" })
    .click();
  await snapshot(page, "skill-existing");
  await page.locator(".z-profile-rules > summary").click();
  const rule = page
    .locator(".z-rule")
    .filter({ has: page.getByText("修改这条", { exact: true }) })
    .first();
  await rule.locator("summary").click();
  await rule.getByRole("button", { name: "修改这条" }).click();
  await page
    .locator(".z-rule textarea")
    .fill("UI 测试：先给一个具体例子，再解释关系。");
  assert.equal(
    first.writes.filter((x) => x.path === "/profile").length,
    1,
    "editing does not auto-save",
  );
  await page.getByRole("button", { name: "保存并开始学习" }).click();
  await page.getByRole("button", { name: "放入正文", exact: true }).click();
  await page
    .locator(".z-composer textarea")
    .fill(source.blocks[0].text.repeat(4));
  await page.getByRole("button", { name: "帮我读懂它", exact: true }).click();
  await page.getByRole("heading", { name: "正在按你的学法整理文章" }).waitFor();
  await snapshot(page, "generation");
  await page.getByRole("button", { name: "先回知藏" }).click();
  assert.ok(
    await page.getByText("正在整理的文章", { exact: true }).isVisible(),
  );
  assert.deepEqual(first.errors, []);
  await first.context.close();

  const existing = await session(profile, [ready, pending, partial, failed]);
  const p = existing.page;
  await snapshot(p, "workspace");
  await p.getByRole("navigation").getByRole("button", { name: "知藏" }).click();
  await snapshot(p, "library");
  await p
    .getByRole("button")
    .filter({ has: p.getByRole("heading", { name: ready.title }) })
    .click();
  await p.locator("video").waitFor();
  await snapshot(p, "lesson-video");
  assert.equal(
    await p.locator(".z-chapter").first().isVisible(),
    false,
    "paired transcript starts collapsed",
  );
  await p.locator("video").evaluate(
    (v) =>
      new Promise((resolve, reject) => {
        if (v.readyState >= 1) return resolve();
        v.addEventListener("loadedmetadata", resolve, { once: true });
        v.addEventListener("error", reject, { once: true });
      }),
  );
  await p.locator(".z-chapter-nav button").nth(2).click();
  assert.ok(
    Math.abs((await p.locator("video").evaluate((v) => v.currentTime)) - 20) <
      1,
  );
  await p.getByRole("combobox", { name: "学习形式" }).selectOption("reading");
  await snapshot(p, "lesson-reading");
  await p.getByRole("button", { name: "查看对应原文" }).first().click();
  await p.getByRole("dialog").waitFor();
  assert.equal(
    await p.locator(".z-source-paragraph").count(),
    4,
    "source retains surrounding paragraphs",
  );
  assert.equal(
    await p.locator("[data-highlight=sentence]").count(),
    1,
    "literal source sentence is highlighted",
  );
  assert.ok(
    (await p.locator("[data-highlight=paragraph]").count()) > 0,
    "legacy paragraph mapping is explicit",
  );
  await p.getByRole("button", { name: "下一处", exact: true }).click();
  await p.getByText("对应原文 2 / 2", { exact: true }).waitFor();
  await p.screenshot({ path: `${out}/source-highlight.png`, fullPage: true });
  assert.equal(await p.evaluate(() => document.body.style.overflow), "hidden");
  await p.keyboard.press("Escape");
  assert.equal(await p.getByRole("dialog").count(), 0);
  assert.equal(
    await p.evaluate(() => document.activeElement.textContent),
    "查看对应原文",
  );
  await p.setViewportSize({ width: 390, height: 844 });
  await p.getByRole("button", { name: "查看对应原文" }).first().click();
  await p.getByRole("button", { name: "返回讲解", exact: true }).waitFor();
  await p.screenshot({ path: `${out}/source-mobile.png`, fullPage: true });
  await p.getByRole("button", { name: "返回讲解", exact: true }).click();
  assert.equal(await p.getByRole("dialog").count(), 0);
  await p.setViewportSize({ width: 390, height: 844 });
  await p.getByRole("button", { name: "打开章节目录" }).click();
  await p.screenshot({
    path: `${out}/lesson-directory-mobile.png`,
    fullPage: true,
  });
  await p
    .getByRole("dialog")
    .getByRole("button")
    .filter({ hasText: content.chapters[1].title })
    .click();
  assert.equal(await p.getByRole("dialog").count(), 0);
  assert.equal(
    await p.locator(".z-chapter-nav button[aria-current='step']").textContent(),
    `02${content.chapters[1].title}`,
  );
  await p.getByRole("combobox", { name: "学习形式" }).selectOption("audio");
  await snapshot(p, "lesson-audio", [1440, 390, 320]);
  await p.getByRole("combobox", { name: "学习形式" }).selectOption("animation");
  await snapshot(p, "lesson-animation", [1440, 390, 320]);
  await p.getByRole("button", { name: "返回知藏" }).click();
  await p
    .getByRole("button")
    .filter({ has: p.getByRole("heading", { name: failed.title }) })
    .click();
  await snapshot(p, "generation-failed", [1440, 390, 320]);
  await p.getByRole("button", { name: "重试未完成部分", exact: true }).click();
  await p.getByRole("heading", { name: "正在按你的学法整理文章" }).waitFor();
  await p.getByRole("button", { name: "先回知藏" }).click();
  await p
    .getByRole("button")
    .filter({ has: p.getByRole("heading", { name: partial.title }) })
    .click();
  await snapshot(p, "generation-partial", [1440, 390, 320]);
  await p.getByRole("button", { name: "先看已保存内容" }).click();
  assert.equal(await p.locator(".z-chapter").first().isVisible(), true);
  assert.deepEqual(existing.errors, []);
  await existing.context.close();
  results.push(
    "questionnaire back-navigation, extras, confirmed Skill edits, generation, modal focus, chapter seeking and failure retry: passed",
  );
  await fs.writeFile(
    `${out}/report.json`,
    JSON.stringify(
      {
        kind: "UI fixtures, not AI efficacy or real generation",
        url: origin,
        at: new Date().toISOString(),
        results,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      passed: true,
      checks: results.length,
      report: `${out}/report.json`,
    }),
  );
} finally {
  await browser.close();
}
