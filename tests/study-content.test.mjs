import assert from "node:assert/strict";
import test from "node:test";
import { validateStudy, learningMarkdown } from "../server/study-content.mjs";
import { studyHTML } from "../server/study-export.mjs";
import { cleanStudyState } from "../lib/study-state.ts";
import {
  validatedJSON,
  validateLesson,
  validateVerifiedLesson,
} from "../server/model.mjs";
import { AppError } from "../server/config.mjs";
import { sourceExcerpts } from "../server/evidence.mjs";
const source = {
  title: "验收原文",
  url: "",
  blocks: [{ id: "p1", text: "假设条件未必成立。" }],
};
const lesson = {
  title: "完整学习",
  lead: "理解条件",
  schemaVersion: 2,
  chapters: [1, 2, 3].map((n) => ({
    id: `s${n}`,
    title: `章节${n}`,
    body: "完整解释",
    kind: "解释",
    sourceIds: ["p1"],
    evidence: [{ sourceId: "p1", quote: "假设条件未必成立。" }],
    narration: "画面讲解",
    audioNarration: "不依赖画面的讲解",
    takeaway: "条件不是结论",
    premise: "仅在假设成立时",
    recallQuestion: "条件为何重要？",
    visual: {
      type: "chain",
      relation: "条件",
      items: [
        { label: "条件", detail: "假设" },
        { label: "判断", detail: "有限结论" },
      ],
    },
  })),
  quiz: [
    {
      question: "条件是？",
      options: ["假设", "事实"],
      correct: 0,
      explanation: "不是事实",
    },
  ],
  adaptation: [],
  takeaways: ["区分条件与事实"],
};
const raw = {
  overview: {
    title: "全文关系",
    groups: [
      { title: "基础", description: "必要条件", chapterIds: ["s1"] },
      { title: "延伸", description: "更多解释", chapterIds: ["s2", "s3"] },
    ],
    connections: [
      {
        from: "s1",
        to: "s2",
        type: "condition",
        label: "若条件成立",
        sourceIds: ["p1"],
      },
    ],
  },
  glossary: [
    { term: "假设", explanation: "用来讨论的前提", sourceIds: ["p1"] },
  ],
  boundaries: ["不代表未来一定发生"],
  scenarios: [
    {
      chapterId: "s2",
      title: "条件不同会怎样",
      setup: "假设我们做一次选择",
      takeaway: "检查前提",
      sourceIds: ["p1"],
      options: [
        {
          label: "假设成立",
          path: ["先检查", "再推演"],
          explanation: "只能条件判断",
        },
        {
          label: "假设不成立",
          path: ["发现不同", "停止推演"],
          explanation: "不能推出原结论",
        },
      ],
    },
  ],
};
test("selectable evidence is copied verbatim from source and never reconstructed by the model", () => {
  const source = {
    blocks: [
      { id: "p1", text: "这是必须保持原样的原文数字 123。".repeat(35) },
      { id: "p2", text: "标题" },
    ],
  };
  const excerpts = sourceExcerpts(source);
  assert.ok(excerpts.length > 2);
  assert.equal(new Set(excerpts.map((e) => e.id)).size, excerpts.length);
  assert.equal(excerpts.map((e) => e.quote).join(""), source.blocks[0].text);
  assert.ok(
    excerpts.every((e) =>
      source.blocks.find((b) => b.id === e.sourceId).text.includes(e.quote),
    ),
  );
});
test("verifier accepts a selected literal excerpt but rejects invented or mismatched excerpt IDs", () => {
  const original = {
    blocks: [
      {
        id: "p1",
        text: "原文提供了一个完整的条件判断，并不意味着假设一定成立。",
      },
    ],
  };
  const checked = {
    lesson: {
      ...lesson,
      chapters: lesson.chapters.map((c) => ({
        ...c,
        body: "完整说明".repeat(20),
        narration: "视频讲解".repeat(20),
        audioNarration: "独立听读解释".repeat(20),
        conceptIds: ["c1"],
        evidence: [{ sourceId: "p1", excerptId: "p1:e1" }],
      })),
    },
  };
  const result = validateVerifiedLesson(checked, original, {
    concepts: [{ id: "c1" }],
  });
  assert.equal(result.chapters[0].evidence[0].quote, original.blocks[0].text);
  checked.lesson.chapters[0].evidence[0].excerptId = "p1:e999";
  assert.throws(
    () =>
      validateVerifiedLesson(checked, original, { concepts: [{ id: "c1" }] }),
    /片段编号/,
  );
});
test("model contract gets one bounded repair and never accepts an invalid fallback", async () => {
  let calls = 0;
  const validate = (data) => {
    if (!data.ok) throw new AppError("invalid", 502, "INVALID_TEST");
    return data;
  };
  const repaired = await validatedJSON(
    "compose-study",
    {},
    validate,
    100,
    async (_prompt, input) => {
      calls++;
      if (calls === 2)
        assert.equal(input.validationFailure.code, "INVALID_TEST");
      return { ok: calls === 2 };
    },
  );
  assert.equal(repaired.ok, true);
  assert.equal(calls, 2);
  calls = 0;
  await assert.rejects(
    validatedJSON("compose-study", {}, validate, 100, async () => {
      calls++;
      return { ok: false };
    }),
    /invalid/,
  );
  assert.equal(calls, 2);
});
test("a long article may use twelve chapters without relaxing source and completeness checks", () => {
  const data = {
    ...lesson,
    chapters: Array.from({ length: 12 }, (_, i) => ({
      ...lesson.chapters[i % 3],
      body: "完整说明".repeat(30),
      narration: "视频讲解".repeat(20),
      audioNarration: "独立听读解释".repeat(20),
      conceptIds: [`c${i + 1}`],
    })),
  };
  assert.equal(validateLesson(data, source, true).chapters.length, 12);
  assert.throws(() =>
    validateLesson(
      { ...data, chapters: [...data.chapters, data.chapters[0]] },
      source,
      true,
    ),
  );
});
test("study schema covers every chapter once, pins valid references and labels teaching hypotheses", () => {
  const value = validateStudy(raw, lesson, source);
  assert.deepEqual(
    value.overview.groups.flatMap((g) => g.chapterIds),
    ["s1", "s2", "s3"],
  );
  assert.equal(value.scenarios[0].fictional, true);
  assert.equal(value.scenarios[0].options[0].id, "o1");
  const unsupportedEdge = structuredClone(raw);
  unsupportedEdge.overview.connections[0].to = "not-a-chapter";
  const bounded = validateStudy(unsupportedEdge, lesson, source);
  assert.equal(bounded.overview.connections.length, 0);
  assert.match(bounded.boundaries.at(-1), /候选章节联系未通过/);
  assert.equal(
    bounded.overview.groups.flatMap((g) => g.chapterIds).length,
    lesson.chapters.length,
  );
  const missing = structuredClone(raw);
  missing.overview.groups[1].chapterIds = ["s2"];
  assert.throws(() => validateStudy(missing, lesson, source));
  const duplicate = structuredClone(raw);
  duplicate.overview.groups[1].chapterIds = ["s1", "s2", "s3"];
  assert.throws(() => validateStudy(duplicate, lesson, source));
  const foreign = structuredClone(raw);
  foreign.scenarios[0].sourceIds = ["fake"];
  assert.throws(() => validateStudy(foreign, lesson, source));
  const oneWay = structuredClone(raw);
  oneWay.scenarios[0].options = [oneWay.scenarios[0].options[0]];
  assert.throws(() => validateStudy(oneWay, lesson, source));
  assert.throws(() => validateStudy({ ...raw, scenarios: [] }, lesson, source));
  assert.equal(
    validateStudy(
      { ...raw, scenarios: [], practiceNote: "没有可分支条件" },
      lesson,
      source,
    ).scenarios.length,
    0,
  );
});
test("progress accepts only existing chapters and choices and bounds time and notes", () => {
  const result = { ...lesson, study: validateStudy(raw, lesson, source) };
  const state = cleanStudyState(
    {
      mode: "diagrams",
      chapter: 999,
      audioTime: 1234,
      videoTime: -8,
      notes: "字".repeat(9000),
      card: 2.9,
      scenario: 9,
      answers: { case1: "o2", "quiz-0": "1", foreign: "poison" },
      role: "admin",
    },
    result,
    { duration: 50, audioDuration: 80 },
  );
  assert.equal(state.chapter, 2);
  assert.equal(state.audioTime, 80);
  assert.equal(state.videoTime, 0);
  assert.equal(state.notes.length, 8000);
  assert.equal(state.scenario, 0);
  assert.equal(state.card, 2);
  assert.deepEqual(state.answers, { case1: "o2", "quiz-0": "1" });
  assert.ok(!("role" in state));
  assert.deepEqual(
    cleanStudyState(
      { mode: "bad", answers: { case1: "o99", "quiz-0": "-1" } },
      result,
      {},
    ),
    { answers: {} },
  );
});
test("offline artifact contains all formats, exact evidence and notes while user text remains inert", () => {
  const result = {
    ...lesson,
    study: validateStudy(raw, lesson, source),
    title: "<script>alert(1)</script>",
  };
  const html = studyHTML(result, source, "", "<img src=x onerror=alert(2)>");
  assert.doesNotMatch(html, /<script>|<img src=x/);
  for (const text of [
    "全文关系",
    "术语速查",
    "互动推演",
    "复习卡",
    "听读讲稿",
    "阅读边界",
    "我的笔记",
    "假设条件未必成立。",
  ])
    assert.ok(html.includes(text), text);
  for (const c of result.chapters) assert.ok(html.includes(`id="${c.id}"`));
  const md = learningMarkdown(
    { result, studyState: { notes: "我的笔记正文" } },
    source,
    "个人 Skill",
  );
  for (const text of [
    "复习卡",
    "独立听读讲稿",
    "我的笔记正文",
    "个人 Skill",
    "p1",
  ])
    assert.ok(md.includes(text));
  assert.ok(
    studyHTML(lesson, source).includes("完整解释"),
    "legacy export must remain readable",
  );
});
