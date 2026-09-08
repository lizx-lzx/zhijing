import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { statistics, statisticalSlide } from "./statistics.mjs";
import { validateScene, validateSlide, locateSegment } from "./contract.mjs";

const dataset = {
  values: [1, 2, 2, 3, 22],
  unit: "本",
  labels: ["读者1", "小林", "读者3", "读者4", "读者5"],
};
test("Media clock rounding does not seek into the previous chapter", () => {
  const timeline = [
    { start: 0, end: 42.720000000000006 },
    { start: 42.720000000000006, end: 80 },
  ];
  assert.equal(locateSegment(timeline, 42.72), timeline[1]);
  assert.equal(locateSegment(timeline, 42.7), timeline[0]);
});
test("Statistics preserve duplicates and correct definitions", () => {
  assert.deepEqual(statistics(dataset.values), {
    total: 30,
    mean: 6,
    median: 2,
    sorted: [1, 2, 2, 3, 22],
  });
  assert.equal(statistics([1, 2, 6, 7]).median, 4);
  assert.throws(() => statistics([1, NaN, 3]));
});
test("Distribution uses one baseline, a common scale and correct 22:1 ratio", () => {
  const slide = statisticalSlide(
    { view: "distribution", title: "测试", subtitle: "同一尺度" },
    dataset,
  );
  validateSlide(slide);
  const bars = slide.elements.filter((e) => /^bar-/.test(e.id));
  assert.equal(bars.length, 5);
  assert.equal(new Set(bars.map((b) => b.left)).size, 1);
  assert.equal(bars[4].width / bars[0].width, 22);
  bars.forEach((b, i) =>
    assert.equal(b.width, dataset.values[i] * b.dataScale),
  );
});
test("Redistribution conserves total and keeps the same before/after scale", () => {
  const slide = statisticalSlide(
    { view: "pool", title: "测试", subtitle: "分摊" },
    dataset,
  );
  validateSlide(slide);
  const before = slide.elements.filter((e) => /^before-bar-/.test(e.id));
  const after = slide.elements.filter((e) => /^after-bar-/.test(e.id));
  assert.ok(after.every((b) => b.dataValue === 6));
  assert.equal(
    before.reduce((n, b) => n + b.height, 0),
    after.reduce((n, b) => n + b.height, 0),
  );
  assert.equal(before[0].dataScale, after[0].dataScale);
});
test("Sorting display includes both 2s and does not pretend to be a number axis", () => {
  const slide = statisticalSlide(
    { view: "rank", title: "测试", subtitle: "排序位置" },
    dataset,
  );
  validateSlide(slide);
  assert.equal(
    slide.elements.filter((e) => /^rank-number-/.test(e.id)).length,
    5,
  );
  assert.match(
    slide.elements.find((e) => e.id === "rank-note").content,
    /不是数值距离/,
  );
});
test("Every view stays inside the canvas", () => {
  for (const view of ["distribution", "pool", "rank", "summary"])
    validateSlide(
      statisticalSlide({ view, title: "测试", subtitle: "说明" }, dataset),
    );
});
test("Executable or external slide content is rejected", () => {
  const slide = statisticalSlide(
    { view: "summary", title: "测试", subtitle: "说明" },
    dataset,
  );
  slide.elements[0].content = "<img src=x onerror=alert(1)>";
  assert.throws(() => validateSlide(slide));
});
test("Actual generated sample has valid actions and continuous audio", () => {
  const lesson = JSON.parse(
    fs.readFileSync(new URL("./lesson.json", import.meta.url)),
  );
  const timing = JSON.parse(
    fs.readFileSync(new URL("./timing.json", import.meta.url)),
  );
  assert.equal(lesson.scenes.length, 4);
  assert.equal(lesson.review.passed, true);
  assert.equal(timing.voiceReady, true);
  assert.equal(timing.duration, timing.segments.at(-1).end);
  assert.equal(lesson.statisticalPlan.dataset.labels[1], "小林");
  assert.equal(lesson.statisticalPlan.dataset.values[1], 2);
  lesson.scenes.forEach(validateScene);
  assert.equal(timing.segments[0].start, 0);
  timing.segments.forEach((seg, i) => {
    assert.ok(seg.end > seg.start);
    if (i) assert.equal(seg.start, timing.segments[i - 1].end);
    assert.equal(locateSegment(timing.segments, seg.start), seg);
    assert.ok(
      lesson.scenes[seg.scene].actions.some(
        (a) => a.type === "speech" && a.text === seg.text,
      ),
    );
  });
});
