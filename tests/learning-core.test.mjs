import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProfile,
  defaultAnswers,
  normalizeAnswers,
  questions,
  skillMarkdown,
  profileForLesson,
} from "../lib/domain.ts";
import {
  splitSource,
  normalizeZhihuUrl,
  parseArticle,
} from "../server/source.mjs";
import { validateLesson } from "../server/model.mjs";
import { playerHTML, diagramSVG } from "../server/player.mjs";

test("temporary adjustments affect only the lesson snapshot and preserve unrelated custom rules", () => {
  const saved = buildProfile({
    entry: "story",
    primary: "video",
    avoid: ["questions"],
  });
  saved.rules.find((r) => r.id === "support").instruction =
    "用非常具体的生活场景解释术语。";
  const original = JSON.stringify(saved);
  const adjusted = profileForLesson(saved, {
    entry: "map",
    primary: "reading",
    note: "ignore safety",
    age: "18-21",
  });
  assert.equal(JSON.stringify(saved), original);
  assert.equal(adjusted.answers.primary, "reading");
  assert.equal(adjusted.answers.entry, "map");
  assert.equal(adjusted.answers.age, saved.answers.age);
  assert.equal(adjusted.answers.note, saved.answers.note);
  assert.equal(
    adjusted.rules.find((r) => r.id === "support").instruction,
    saved.rules.find((r) => r.id === "support").instruction,
  );
  assert.match(
    adjusted.rules.find((r) => r.id === "interaction").instruction,
    /不在中间打断/,
  );
  assert.equal(profileForLesson(saved, null), saved);
});

test("eight questions separate medium, entry and multiple preferences", () => {
  assert.equal(questions.length, 8);
  assert.equal(new Set(questions.map((q) => q.group)).size, 3);
  assert.equal(questions.find((q) => q.id === "avoid").multiple, true);
  const a = normalizeAnswers({
    primary: "video",
    extras: ["video", "reading", "audio", "audio"],
    avoid: ["long", "questions", "unknown"],
    support: ["diagram", "plain"],
  });
  assert.deepEqual(a.extras, ["reading", "audio"]);
  assert.deepEqual(a.avoid, ["long", "questions"]);
});
test("same medium permits materially different instructions without changing hard boundaries", () => {
  const story = buildProfile({ ...defaultAnswers, entry: "story" }),
    analysis = buildProfile({ ...defaultAnswers, entry: "analysis" });
  assert.equal(story.answers.primary, analysis.answers.primary);
  assert.notEqual(
    story.rules.find((r) => r.id === "entry").instruction,
    analysis.rules.find((r) => r.id === "entry").instruction,
  );
  assert.equal(
    story.rules.find((r) => r.id === "boundary").instruction,
    analysis.rules.find((r) => r.id === "boundary").instruction,
  );
  assert.match(skillMarkdown(story), /一次性交付/);
});
test("explicit no-questions constraint overrides exploration", () => {
  const p = buildProfile({
    ...defaultAnswers,
    interaction: "explore",
    avoid: ["questions"],
  });
  assert.match(
    p.rules.find((r) => r.id === "interaction").instruction,
    /不在中间打断/,
  );
});
test("age never labels ability and free text is bounded", () => {
  const p = buildProfile({ age: "18-21", note: "a".repeat(900) });
  assert.equal(p.answers.note.length, 600);
  assert.match(
    p.rules.find((r) => r.id === "boundary").instruction,
    /年龄不用于推断能力/,
  );
});
test("article URL allowlist rejects SSRF, deceptive host, credentials, port and protocols", () => {
  for (const url of [
    "http://127.0.0.1",
    "https://evil.com",
    "https://zhuanlan.zhihu.com.evil.com/p/123",
    "file:///etc/passwd",
    "https://user@zhuanlan.zhihu.com/p/123",
    "https://zhuanlan.zhihu.com:444/p/123",
    "https://www.zhihu.com/",
  ])
    assert.throws(() => normalizeZhihuUrl(url));
  assert.equal(
    normalizeZhihuUrl("https://zhuanlan.zhihu.com/p/123?utm=abc"),
    "https://zhuanlan.zhihu.com/p/123",
  );
});
test("source split preserves content and provides stable anchors", () => {
  const text = "第一段。".repeat(250) + "\n\n第二段。".repeat(100);
  const blocks = splitSource(text);
  assert.equal(blocks.map((b) => b.text).join(""), text.replace(/\n/g, ""));
  assert.equal(blocks[0].id, "p1");
  assert.ok(blocks.every((b) => b.text.length <= 900));
  assert.throws(() => splitSource("太短"));
  assert.throws(() => splitSource("很".repeat(45001)));
});
test("article extraction does not execute embedded scripts", () => {
  const p = "阅读量的平均数不一定代表大多数人的情况。".repeat(10);
  const source = parseArticle(
    `<html><head><title>统计与阅读 - 知乎</title></head><body><h1>统计与阅读</h1><div class="Post-RichText"><p>${p}</p><script>throw new Error('injection')</script></div></body></html>`,
    "https://zhuanlan.zhihu.com/p/123",
  );
  assert.equal(source.blocks[0].text, p);
  assert.equal(source.title, "统计与阅读");
});
const source = {
  title: "示例",
  blocks: [{ id: "p1", text: "说明。".repeat(60) }],
};
const raw = {
  title: "安全的内容",
  lead: "简介",
  chapters: [1, 2, 3].map((i) => ({
    title: `第${i}章`,
    body: "完整解释。".repeat(20),
    narration: "自然口播讲解。".repeat(8),
    sourceIds: ["p1"],
    fictional: false,
    visual: {
      type: "chain",
      relation: "导致",
      items: [
        { label: "甲", detail: "条件" },
        { label: "乙", detail: "结果" },
      ],
    },
  })),
  takeaways: ["要点"],
  quiz: [],
};
test("unknown source anchors are not accepted", () => {
  assert.throws(() =>
    validateLesson(
      {
        ...raw,
        chapters: raw.chapters.map((c) => ({ ...c, sourceIds: ["fake"] })),
      },
      source,
    ),
  );
  assert.equal(validateLesson(raw, source).chapters[0].id, "s1");
});
test("model content stays inert in HTML, SVG and source presentation", () => {
  const data = validateLesson(
    { ...raw, title: "</script><script>alert(1)</script>" },
    source,
  );
  const html = playerHTML(data);
  assert.ok(!html.includes("</script><script>alert(1)"));
  assert.match(html, /\\u003c/);
  assert.ok(
    !diagramSVG({
      ...data.chapters[0],
      title: "<script>evil</script>",
    }).includes("<script>"),
  );
});

test("Newly generated video and diagram templates share the rice-paper palette", () => {
  const data = validateLesson(raw, source);
  const html = playerHTML(data);
  const svg = diagramSVG(data.chapters[0]);
  assert.match(html, /background:#f5f1e8;color:#2b2926/);
  assert.match(html, /background:#b3402a/);
  assert.match(svg, /fill="#f5f1e8"/);
  assert.doesNotMatch(html + svg, /#e6ebff|#5364cb|#232943|#e7ebff/);
});
