import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import {
  clampTime,
  makeReviewCards,
  validateLearningFormats,
  formatsMarkdown,
  playbackRates,
} from "./learning-formats.mjs";
import { learningFormats } from "./lessons/window-five-years/formats.mjs";
const edition = new URL("./lessons/window-five-years/", import.meta.url);
const lesson = JSON.parse(fs.readFileSync(new URL("lesson.json", edition)));
// Compile the presentation module for server-render tests; no browser or DOM.
const moduleSource = fs.readFileSync(
  new URL("./format-views.jsx", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(moduleSource, {
  compilerOptions: {
    jsx: ts.JsxEmit.React,
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const outputDir = new URL("./render/formats-unit/", edition);
fs.mkdirSync(outputDir, { recursive: true });
const output = new URL("format-views.mjs", outputDir);
fs.writeFileSync(
  output,
  compiled.replace(
    '"./learning-formats.mjs"',
    JSON.stringify(new URL("./learning-formats.mjs", import.meta.url).href),
  ),
);
const { InlineDiagram, Overview, Practice } = await import(output.href);
test("Overview follows the shared chapter instead of resetting to chapter one", () => {
  const chapter = lesson.scenes[3];
  const html = renderToStaticMarkup(
    React.createElement(Overview, {
      lesson,
      onRead() {},
      activeChapter: chapter.id,
      onSelect() {},
    }),
  );
  assert.ok(html.includes(`<h3>${chapter.title}</h3>`));
  assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1);
  assert.ok(html.includes(`aria-pressed="true">${chapter.title}`));
});
const noop = () => {};
const props = {
  lesson,
  onRead: noop,
  answers: {},
  onAnswer: noop,
  cardIndex: 0,
  onCard: noop,
  revealed: false,
  onReveal: noop,
  view: "scenarios",
  onView: noop,
  scenarioIndex: 0,
  onScenario: noop,
};
const render = (component, input) =>
  renderToStaticMarkup(React.createElement(component, input));

test("All article formats compile from edition data; every chapter appears exactly once", () => {
  assert.deepEqual(lesson.learningFormats, learningFormats);
  validateLearningFormats(lesson);
  const invalid = structuredClone(lesson);
  invalid.learningFormats.overview.groups[0].chapters.push("income");
  assert.throws(() => validateLearningFormats(invalid), /exactly once/);
  const overview = render(Overview, { lesson, onRead: noop });
  for (const scene of lesson.scenes) assert.ok(overview.includes(scene.title));
  assert.match(overview, /不是事件必然发生的顺序/);
});
test("Inline reading diagrams retain all nodes, parallel groups and conditions", () => {
  for (const scene of lesson.scenes) {
    const html = render(InlineDiagram, { diagram: scene.diagram });
    for (const node of scene.diagram.groups.flat())
      assert.ok(html.includes(node.title));
    assert.equal(
      (html.match(/class="inline-path"/g) || []).length,
      scene.diagram.groups.length,
    );
    assert.ok(html.includes(scene.diagram.note));
    if (scene.diagram.layout === "cycle") assert.match(html, /可能再强化起点/);
  }
});
test("Three scenarios render two distinct conditional outcomes each, without automatic answers", () => {
  for (const [i, scenario] of learningFormats.scenarios.entries()) {
    const initial = render(Practice, { ...props, scenarioIndex: i });
    assert.match(initial, /教学假设，不是经济预测/);
    assert.match(initial, /选一个条件看变化/);
    const variants = scenario.options.map((option) => {
      const html = render(Practice, {
        ...props,
        scenarioIndex: i,
        answers: { [scenario.id]: option.id },
      });
      for (const step of option.path) assert.ok(html.includes(step));
      assert.ok(html.includes(option.explanation));
      assert.doesNotMatch(html, /可选练习 · 不计分|不改变你的学习偏好/);
      return html;
    });
    assert.notEqual(variants[0], variants[1]);
  }
});
test("Ten optional recall cards hide answers first, reveal source-bound answers, and bound navigation", () => {
  const cards = makeReviewCards(lesson);
  assert.equal(cards.length, 10);
  for (const [i, card] of cards.entries()) {
    const hidden = render(Practice, { ...props, view: "cards", cardIndex: i });
    const shown = render(Practice, {
      ...props,
      view: "cards",
      cardIndex: i,
      revealed: true,
    });
    assert.ok(hidden.includes(card.question));
    assert.ok(!hidden.includes(card.answer));
    assert.ok(shown.includes(card.answer));
    assert.ok(shown.includes(card.premise));
    assert.ok(shown.includes(card.sourceAnchor.quote));
    assert.doesNotMatch(shown, /用户提供文本 · 第|先想一想，或直接看答案/);
    assert.match(hidden, /aria-expanded="false"/);
    assert.match(shown, /aria-expanded="true"/);
    if (i === 0) assert.match(hidden, /disabled="">上一张/);
    if (i === 9) assert.match(hidden, /disabled="">下一张/);
  }
});
test("Downloads include every scenario and every card, and match the compiled artifact", () => {
  const content = formatsMarkdown(lesson);
  assert.equal(
    fs.readFileSync(new URL("public/learning-formats.md", edition), "utf8"),
    content,
  );
  for (const card of makeReviewCards(lesson))
    assert.ok(content.includes(card.question) && content.includes(card.answer));
  for (const s of learningFormats.scenarios)
    for (const o of s.options) assert.ok(content.includes(o.explanation));
  assert.match(content, /改编教学假设/);
});
test("Audio navigation remains bounded and speed choices include normal playback", () => {
  assert.equal(clampTime(-15, 408.8), 0);
  assert.equal(clampTime(500, 408.8), 408.79);
  assert.equal(clampTime(NaN, 408.8), 0);
  assert.equal(clampTime(30, 0), 0);
  assert.equal(clampTime(120, 408.8), 120);
  assert.deepEqual(playbackRates, [0.75, 1, 1.25, 1.5, 2]);
});
test("Rice theme preserves released narration, content and recording geometry", () => {
  const previous = JSON.parse(
    execFileSync(
      "git",
      [
        "show",
        "f457b48:experiments/openmaic-preview/lessons/window-five-years/lesson.json",
      ],
      { encoding: "utf8" },
    ),
  );
  const stable = (scenes) =>
    scenes.map((s) => ({
      actions: s.actions,
      diagram: s.diagram,
      canvas: {
        ...s.content.canvas,
        id: undefined,
        background: undefined,
        elements: s.content.canvas.elements.map((element) => ({
          ...element,
          fill: undefined,
          defaultColor: undefined,
          defaultFontName: undefined,
        })),
      },
    }));
  assert.deepEqual(stable(lesson.scenes), stable(previous.scenes));
  if (process.env.ZH_REQUIRE_MEDIA === "1")
    assert.equal(
      createHash("sha256")
        .update(fs.readFileSync(new URL("public/media/audio.m4a", edition)))
        .digest("hex"),
      "84a81b66fe33aa28ac1c9dd24d66ddf5a9cc8f8a25a3118e2433a20ddd1bc4bd",
    );
});

test("Rice theme is baked into every chapter, not only player chrome", () => {
  const palette = new Set([
    "#f5f1e8",
    "#2b2926",
    "#736b61",
    "#ebe5d9",
    "#b3402a",
    "#8d301f",
    "#8a8174",
  ]);
  for (const scene of lesson.scenes) {
    const canvas = scene.content.canvas;
    assert.equal(canvas.background.color, "#f5f1e8");
    for (const element of canvas.elements) {
      if (element.fill) assert.ok(palette.has(element.fill));
      if (element.defaultColor) assert.ok(palette.has(element.defaultColor));
    }
  }
});
