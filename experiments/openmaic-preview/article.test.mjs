import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { article, chapters } from "./lessons/window-five-years/content.mjs";
import { validateScene, validateSlide, locateSegment } from "./contract.mjs";
import { narrativeSlide } from "./narrative-slide.mjs";
import { editionPaths } from "./paths.mjs";
const { root } = editionPaths("window-five-years");
const lesson = JSON.parse(fs.readFileSync(new URL("lesson.json", root)));

test("Article edition is content-driven and not the mathematical fixture", () => {
  assert.equal(lesson.title, article.title);
  assert.equal(lesson.author, "riba2534");
  assert.equal(lesson.scenes.length, 10);
  assert.equal(lesson.source, "");
  assert.ok(!JSON.stringify(lesson).includes("人均六本"));
  assert.deepEqual(
    lesson.scenes.map((s) => s.id),
    chapters.map((c) => c.id),
  );
  assert.throws(() => editionPaths("../../private"));
});
test("Every chapter contains traceable excerpts and complete reading support", () => {
  for (const [i, scene] of lesson.scenes.entries()) {
    validateScene(scene);
    assert.equal(scene.sourceAnchor.quote, chapters[i].quote);
    assert.ok(scene.sourceAnchor.startLine > 0);
    assert.ok(scene.reading.length >= 2);
    assert.ok(scene.takeaway.length > 10);
    assert.ok(scene.premise.length > 10);
    assert.equal(scene.actions.filter((a) => a.type === "speech").length, 3);
  }
});
test("Relationship diagrams have bounded geometry and distinct structures", () => {
  assert.equal(new Set(chapters.map((c) => c.layout)).size, 6);
  for (const [i, c] of chapters.entries())
    validateSlide(narrativeSlide(c, i, 10));
  const cycle = narrativeSlide(chapters[7], 7, 10);
  const ids = cycle.elements.map((e) => e.id);
  assert.ok(ids.includes("arrow-down") && ids.includes("arrow-up"));
});
test("Prediction and evidence boundaries are retained", () => {
  assert.match(lesson.sourceNote, /推演/);
  assert.match(lesson.checks[0].text, /不是失业率/);
  assert.match(lesson.checks[2].text, /选择偏差/);
  assert.ok(
    lesson.checks.every((c) =>
      c.links.every((l) => new URL(l.url).protocol === "https:"),
    ),
  );
  assert.equal(lesson.reviewQuestions.length, 3);
  assert.match(
    lesson.scenes
      .at(-1)
      .actions.map((a) => a.text || "")
      .join(""),
    /不是适合每个人/,
  );
});
test(
  "User source hash and all quoted line anchors match the actual attachment",
  { skip: !process.env.ZH_SOURCE_FILE },
  () => {
    const source = fs.readFileSync(process.env.ZH_SOURCE_FILE, "utf8");
    assert.equal(
      createHash("sha256").update(source).digest("hex"),
      lesson.sourceMeta.hash,
    );
    for (const s of lesson.scenes)
      assert.ok(
        source
          .split("\n")
          .slice(s.sourceAnchor.startLine - 1, s.sourceAnchor.endLine)
          .join("\n")
          .includes(s.sourceAnchor.quote),
      );
  },
);
test(
  "Ready narration has continuous, matching segments with an honest alignment label",
  { skip: process.env.ZH_REQUIRE_MEDIA !== "1" },
  () => {
    const timing = JSON.parse(fs.readFileSync(new URL("timing.json", root)));
    assert.equal(timing.voiceReady, true);
    assert.equal(timing.segments.length, 30);
    assert.match(timing.alignment, /proportional/);
    assert.equal(timing.duration, timing.segments.at(-1).end);
    timing.segments.forEach((s, i) => {
      if (i) assert.ok(Math.abs(s.start - timing.segments[i - 1].end) < 1e-6);
      assert.equal(
        locateSegment(timing.segments, Math.round(s.start * 1e6) / 1e6),
        s,
      );
      assert.ok(
        lesson.scenes[s.scene].actions.some(
          (a) => a.type === "speech" && a.text === s.text,
        ),
      );
    });
  },
);
