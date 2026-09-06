import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Zhijing landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="zh-CN">/);
  assert.match(html, /<title>知径｜先认识你，再为你讲知识<\/title>/);
  assert.match(html, /一次问卷，以后自动适配/);
  assert.match(html, /开始了解我的学习方式/);
  assert.match(html, /看一个完整案例/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
});

test("keeps the questionnaire tied to executable Skill rules", async () => {
  const [page, design] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../docs/04-问卷与个人学习Skill映射-v0.2.md", import.meta.url),
      "utf8",
    ),
  ]);

  const questionsBlock = page.slice(
    page.indexOf("const questions"),
    page.indexOf("const optionLabels"),
  );
  const questionIds = [...questionsBlock.matchAll(/id: "(age|goal|entry|support|interaction|avoid)"/g)]
    .map((match) => match[1]);
  assert.deepEqual(questionIds, [
    "age",
    "goal",
    "entry",
    "support",
    "interaction",
    "avoid",
  ]);

  assert.match(page, /function buildPersonalLearningSkill/);
  assert.match(page, /questionnaire: answers/);
  assert.match(page, /skill: personalSkill/);
  assert.match(page, /version: 2/);
  assert.match(page, /answers\.avoid === "questions"/);
  assert.match(page, /answers\.avoid === "flashy" && answers\.entry === "video"/);
  assert.match(page, /不再逐篇强制追问熟悉度/);
  assert.doesNotMatch(page, /answers\.medium/);

  assert.match(design, /6 道单选题/);
  assert.match(design, /每个答案都至少改变一条生成规则/);
  assert.match(design, /问卷产生的整个 Skill 都只能叫“初稿”/);
});
