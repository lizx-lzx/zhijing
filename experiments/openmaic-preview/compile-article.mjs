import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { buildCompleteScene } from "@openmaic/generation";
import {
  article,
  chapters,
  glossary,
  checks,
  reviewQuestions,
} from "./lessons/window-five-years/content.mjs";
import { narrativeSlide, narrativeDiagram } from "./narrative-slide.mjs";
import { validateScene } from "./contract.mjs";
import { editionPaths } from "./paths.mjs";
import { learningFormats } from "./lessons/window-five-years/formats.mjs";
import {
  validateLearningFormats,
  formatsMarkdown,
} from "./learning-formats.mjs";

const sourcePath = process.argv[2];
if (!sourcePath)
  throw new Error("Provide the user-authorized source text path");
const source = await fs.readFile(sourcePath, "utf8");
if (!source.startsWith(article.title) || !source.includes(article.author))
  throw new Error("Source identity mismatch");
const { root } = editionPaths("window-five-years");
const sample = JSON.parse(
  await fs.readFile(new URL("./lesson.json", import.meta.url), "utf8"),
);
const profile = structuredClone(sample.profile);
profile.rules = profile.rules.filter(
  (r) => !/均值|中位数|柱状/.test(r.instruction),
);
const sourceHash = createHash("sha256").update(source).digest("hex");
const scenes = chapters.map((c, i) => {
  const at = source.indexOf(c.quote);
  if (at < 0) throw new Error(`Untraceable quote for ${c.id}`);
  const startLine = source.slice(0, at).split("\n").length;
  const paragraphStart = source.lastIndexOf("\n\n", at);
  const paragraphEnd = source.indexOf("\n\n", at + c.quote.length);
  const actions = c.speech.flatMap((text, n) => [
    {
      id: `${c.id}-cue-${n}`,
      type: "highlight",
      elementId:
        n === 0 ? "title" : `node-${Math.min(n - 1, c.nodes.length - 1)}`,
    },
    { id: `${c.id}-speech-${n}`, type: "speech", text, agentId: "teacher" },
  ]);
  const scene = buildCompleteScene(
    { id: c.id, type: "slide", title: c.title, order: i },
    narrativeSlide(
      c,
      i,
      chapters.length,
      `改编自 ${article.author} 的知乎文章`,
    ),
    actions,
    "zhijing-article",
    { sceneId: c.id },
  );
  scene.sourceAnchor = {
    section: c.title,
    quote: c.quote,
    startLine,
    endLine: startLine + c.quote.split("\n").length - 1,
    context: source
      .slice(
        paragraphStart < 0 ? 0 : paragraphStart + 2,
        paragraphEnd < 0 ? source.length : paragraphEnd,
      )
      .trim(),
  };
  scene.takeaway = c.takeaway;
  scene.reading = c.reading;
  scene.premise = c.premise;
  scene.kind = c.kind;
  scene.diagram = narrativeDiagram(c);
  validateScene(scene);
  return scene;
});
const lesson = {
  ...article,
  source: "",
  sourceMeta: {
    title: article.title,
    author: article.author,
    url: article.url,
    context: article.context,
    acquisition: "用户提供正文；未在线核验页面版本",
    hash: sourceHash,
    publication: "发布改编讲解、必要短引及定位，不发布整篇原文",
  },
  profile,
  skill: sample.skill,
  scenes,
  glossary,
  checks,
  reviewQuestions,
  learningFormats,
  mediaPolicy: {
    voiceUnit: "chapter",
    captions: "章节实测；章内讲解及字幕按文本长度近似对齐",
  },
  review: {
    passed: true,
    kind: "editorial-source-checked",
    note: "本 Agent 通读用户正文，逐章核对论点与短引；三组关键说法查阅原始来源，其余不宣称已核实。",
  },
  provenance: {
    sourceHash,
    preparedAt: new Date().toISOString(),
    mode: "基于用户正文逐章编写和审核的单篇学习作品，非通用自动生成能力验收",
    generation:
      "OpenMAIC buildCompleteScene 组装人工审定内容；不声称本篇由 generateSceneActions 自动创作",
    renderer: "@openmaic/renderer@0.1.6",
    profile: "沿用上一份经模型生成的故事/视频/不提问示例规则，不是重新测评用户",
  },
};
validateLearningFormats(lesson);
await fs.mkdir(new URL("public/", root), { recursive: true });
await fs.mkdir(new URL("render/", root), { recursive: true });
await fs.writeFile(
  new URL("lesson.json", root),
  JSON.stringify(lesson, null, 2),
);
// Provisional timings only when no real narration exists. Never overwrite audio timing.
try {
  await fs.access(new URL("timing.json", root));
} catch {
  let cursor = 0;
  const segments = scenes.flatMap((s, i) => {
    let effect = null;
    return s.actions.flatMap((a) => {
      if (a.type !== "speech") {
        effect = { type: a.type, elementId: a.elementId };
        return [];
      }
      const start = cursor;
      cursor += Math.max(4, a.text.length / 4);
      return [{ scene: i, text: a.text, effect, start, end: cursor }];
    });
  });
  await fs.writeFile(
    new URL("timing.json", root),
    JSON.stringify({ duration: cursor, voiceReady: false, segments }, null, 2),
  );
}
const notes = [
  `# ${article.title}｜学习笔记`,
  `原作者：${article.author}。${article.context}。依据用户提供正文改编。`,
  `> ${article.sourceNote}`,
  `## 一句话带走\n\n${article.thesis}`,
  ...scenes.map(
    (s, i) =>
      `## ${i + 1}. ${s.title}\n\n${s.reading.join("\n\n")}\n\n**带走：**${s.takeaway}\n\n**成立条件：**${s.premise}\n\n> 原文锚点（用户提供文本第 ${s.sourceAnchor.startLine} 行）：${s.sourceAnchor.quote}`,
  ),
  "## 术语速查",
  ...glossary.map(([name, explanation]) => `- **${name}**：${explanation}`),
  "## 关键说法核验（非全文认证）",
  ...checks.map(
    (c) =>
      `### ${c.label} · ${c.status}\n\n${c.text}\n\n${c.links.map((l) => `[${l.title}](${l.url})`).join(" / ")}`,
  ),
  "## 自愿自测",
  ...reviewQuestions.map((q) => `### ${q.question}\n\n${q.answer}`),
].join("\n\n");
await fs.writeFile(new URL("public/learning-notes.md", root), notes);
await fs.writeFile(
  new URL("public/learning-formats.md", root),
  formatsMarkdown(lesson),
);
await fs.writeFile(
  new URL("public/learning-skill.md", root),
  `${sample.skill}\n\n本次来源边界：作者推演与核验事实分开；不把年份当承诺；不输出个人投资指令。\n`,
);
await fs.writeFile(
  new URL("public/transcript.txt", root),
  scenes
    .map(
      (s, i) =>
        `${i + 1}. ${s.title}\n${s.actions
          .filter((a) => a.type === "speech")
          .map((a) => a.text)
          .join("\n\n")}`,
    )
    .join("\n\n"),
);
await fs.copyFile(
  new URL("./public/THIRD-PARTY-NOTICES.txt", import.meta.url),
  new URL("public/THIRD-PARTY-NOTICES.txt", root),
);
console.log(
  "ARTICLE_COMPILED",
  scenes.length,
  "chapters",
  chapters.reduce((n, c) => n + c.speech.join("").length, 0),
  "narration characters",
  sourceHash,
);
