// Component render acceptance, without opening or interacting with a browser.
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { buildProfile } from "../lib/domain.ts";
test("main product renders all seven study modes from a single private lesson", async () => {
  const server = await createServer({
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true },
    appType: "custom",
  });
  try {
    const { LessonView } = await server.ssrLoadModule(
      "/components/learning-lesson.tsx",
    );
    const chapters = [1, 2, 3].map((i) => ({
      id: `s${i}`,
      title: `真实内容章节${i}`,
      kind: "解释",
      body: "具体内容与来源解释",
      narration: "视频解释",
      audioNarration: "独立听读解释",
      sourceIds: ["p1"],
      takeaway: "带走具体判断",
      premise: "判断需要条件",
      recallQuestion: "判断依据是什么？",
      visual: {
        type: "chain",
        relation: "条件",
        items: [
          { label: "前提", detail: "假设成立" },
          { label: "结论", detail: "有条件判断" },
        ],
      },
    }));
    const lesson = {
      id: "a".repeat(32),
      title: "作品",
      status: "ready",
      formats: ["video", "reading", "audio", "animation"],
      progress: 100,
      stage: "已完成",
      profile: buildProfile({}),
      media: {
        status: "ready",
        videoReady: true,
        audioReady: true,
        audioFile: "listen.m4a",
        trackReady: true,
        duration: 90,
        audioDuration: 100,
        scenes: chapters.map((_, i) => ({ start: i * 30, end: (i + 1) * 30 })),
      },
      result: {
        title: "全文学习作品",
        lead: "原文的关键问题",
        schemaVersion: 2,
        chapters,
        adaptation: ["按规则讲解"],
        takeaways: ["区分假设"],
        quiz: [],
        study: {
          version: 2,
          overview: {
            title: "全景结构",
            groups: [
              {
                title: "知识组合",
                description: "展开",
                chapterIds: ["s1", "s2", "s3"],
              },
            ],
            connections: [],
          },
          glossary: [],
          scenarios: [],
          practiceNote: "本文无需推演",
          boundaries: ["假设不是事实"],
        },
      },
    };
    for (const [mode, expected] of Object.entries({
      video: "video.mp4",
      audio: "listen.m4a",
      reading: "完整图文",
      diagrams: "下载本章图解",
      overview: "全景结构",
      practice: "本文无需推演",
      animation: "个性化网页讲解",
    })) {
      const html = renderToStaticMarkup(
        createElement(LessonView, {
          initial: { ...lesson, studyState: { mode } },
          onBack() {},
          onUpdate() {},
          notify() {},
        }),
      );
      assert.ok(html.includes(expected), mode);
      assert.ok(html.includes("我的笔记"));
      assert.ok(html.includes("导出"));
      assert.ok(html.includes('aria-pressed="true"'));
      assert.doesNotMatch(html, /×\s*OpenMAIC/);
    }
    const legacy = structuredClone(lesson);
    delete legacy.result.schemaVersion;
    delete legacy.result.study;
    const html = renderToStaticMarkup(
      createElement(LessonView, {
        initial: legacy,
        onBack() {},
        onUpdate() {},
        notify() {},
      }),
    );
    assert.ok(html.includes("生成新版，保留原版"));
  } finally {
    await server.close();
  }
});
