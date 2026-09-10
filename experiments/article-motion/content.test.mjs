import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  article,
  chapters,
} from "../openmaic-preview/lessons/window-five-years/content.mjs";
const root = new URL(
  "../../public/demo/zhihu-motion-20260910/",
  import.meta.url,
);
test("animated edition preserves all ten reviewed chapters and original narration", async () => {
  const data = JSON.parse(
    await fs.readFile(new URL("content.json", root), "utf8"),
  );
  assert.deepEqual(data.article, article);
  assert.deepEqual(data.chapters, chapters);
  assert.equal(data.chapters.length, 10);
  assert.equal(data.timing.segments.length, 30);
  assert.equal(data.timing.duration, 408.8);
  for (let i = 0; i < 10; i++) {
    const segments = data.timing.segments.filter((s) => s.scene === i);
    assert.deepEqual(
      segments.map((s) => s.text),
      chapters[i].speech,
    );
    for (const s of segments) assert.ok(s.end > s.start);
  }
  assert.deepEqual(
    await fs.readFile(new URL("audio.m4a", root)),
    await fs.readFile(
      new URL(
        "../openmaic-preview/lessons/window-five-years/public/media/audio.m4a",
        import.meta.url,
      ),
    ),
  );
});
test("web animation and video are distinct, optional playback modes", async () => {
  const html = await fs.readFile(new URL("index.html", root), "utf8");
  const js = await fs.readFile(new URL("motion.js", root), "utf8");
  assert.match(html, /网页动画/);
  assert.match(html, /动效视频/);
  assert.match(html, /静态图文/);
  assert.doesNotMatch(html, /autoplay/i);
  assert.match(js, /Motion.drawPath/);
  assert.match(js, /Motion.flyIn/);
  assert.match(js, /two && i === 3/); // parallel causal paths must not join across rows
});
