import { AppError } from "./config.mjs";

const text = (value, max = 1000) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
const list = (value) => (Array.isArray(value) ? value : []);
const fail = (field, expected, received) => {
  const error = new AppError(
    "补充学习内容未通过完整性或来源检查，已保存的内容仍可阅读。",
    502,
    "INVALID_STUDY",
  );
  error.details = { field, expected, received };
  throw error;
};
export function validateStudy(data, lesson, source) {
  if (!data || typeof data !== "object")
    fail("study", "完整配套对象", typeof data);
  const chapters = new Map(lesson.chapters.map((c) => [c.id, c]));
  const sources = new Set(source.blocks.map((b) => b.id));
  const sourceIds = (value) => {
    const ids = [...new Set(list(value))];
    if (!ids.length || ids.some((id) => !sources.has(id)))
      fail("sourceIds", "至少一个实际存在的原文段落编号", ids);
    return ids;
  };
  const groups = list(data.overview?.groups).map((g) => ({
    title: text(g.title, 60),
    description: text(g.description, 240),
    chapterIds: [...new Set(list(g.chapterIds))],
  }));
  const mapped = groups.flatMap((g) => g.chapterIds);
  if (
    !groups.length ||
    groups.length > 6 ||
    groups.some((g) => !g.title || !g.chapterIds.length) ||
    mapped.length !== chapters.size ||
    new Set(mapped).size !== chapters.size ||
    mapped.some((id) => !chapters.has(id))
  )
    fail(
      "overview.groups",
      {
        chapterIds: [...chapters.keys()],
        rule: "每章必须且只能出现一次；每组需标题与至少一章",
      },
      mapped,
    );
  const connections = list(data.overview?.connections)
    .slice(0, 24)
    .map((r) => {
      if (
        !chapters.has(r.from) ||
        !chapters.has(r.to) ||
        r.from === r.to ||
        !["condition", "contrast", "sequence", "related"].includes(r.type) ||
        !text(r.label, 100)
      )
        fail(
          "overview.connections",
          {
            chapterIds: [...chapters.keys()],
            types: ["condition", "contrast", "sequence", "related"],
            rule: "from/to 必须是不同的真实章节编号；label必填；type只能选一个枚举",
          },
          { from: r.from, to: r.to, type: r.type, label: r.label },
        );
      return {
        from: r.from,
        to: r.to,
        type: r.type,
        label: text(r.label, 100),
        sourceIds: sourceIds(r.sourceIds),
      };
    });
  const glossary = list(data.glossary)
    .slice(0, 12)
    .map((g) => {
      if (!text(g.term, 60) || !text(g.explanation, 600))
        fail("glossary", "每项需要 term 和 explanation", g);
      return {
        term: text(g.term, 60),
        explanation: text(g.explanation, 600),
        sourceIds: sourceIds(g.sourceIds),
      };
    });
  const scenarios = list(data.scenarios)
    .slice(0, 4)
    .map((s, i) => {
      if (
        !chapters.has(s.chapterId) ||
        !text(s.title, 100) ||
        !text(s.setup, 600) ||
        !text(s.takeaway, 600)
      )
        fail(
          `scenarios[${i}]`,
          {
            chapterIds: [...chapters.keys()],
            required: ["chapterId", "title", "setup", "takeaway"],
          },
          s,
        );
      const options = list(s.options).map((o, j) => {
        const steps = list(o.path).map((v) => text(v, 160));
        if (
          !text(o.label, 100) ||
          !text(o.explanation, 800) ||
          steps.length < 2 ||
          steps.length > 5 ||
          steps.some((v) => !v)
        )
          fail(
            `scenarios[${i}].options[${j}]`,
            "必须有 label/explanation，path为2至5个非空步骤字符串组成的数组",
            o,
          );
        return {
          id: `o${j + 1}`,
          label: text(o.label, 100),
          path: steps,
          explanation: text(o.explanation, 800),
        };
      });
      if (options.length < 2 || options.length > 3)
        fail(`scenarios[${i}].options`, "2至3个选项", options.length);
      return {
        id: `case${i + 1}`,
        chapterId: s.chapterId,
        title: text(s.title, 100),
        setup: text(s.setup, 600),
        takeaway: text(s.takeaway, 600),
        fictional: true,
        sourceIds: sourceIds(s.sourceIds),
        options,
      };
    });
  const boundaries = list(data.boundaries)
    .slice(0, 12)
    .map((b) => text(b, 700))
    .filter(Boolean);
  if (!scenarios.length && !text(data.practiceNote, 500))
    fail(
      "practiceNote",
      "无推演情境时必须解释为什么，没有依据不要强行编造情境",
      data.practiceNote,
    );
  return {
    version: 2,
    overview: {
      title: text(data.overview.title, 160) || lesson.title,
      groups,
      connections,
    },
    glossary,
    scenarios,
    boundaries,
    practiceNote: text(data.practiceNote, 500),
  };
}

export function learningMarkdown(lesson, source, profileMarkdown = "") {
  const result = lesson.result;
  if (!result) throw new AppError("内容仍在生成中。", 409);
  const parts = [
    `# ${result.title}`,
    source.url
      ? `来源：[${source.title}](${source.url})`
      : `来源：${source.title}（用户提供或平台标注示例）`,
    "> 这是基于来源的 AI 学习改编，不代表原文事实已被外部核验。虚构情境与作者推演不能视为事实。",
    result.lead,
  ];
  for (const [i, c] of result.chapters.entries()) {
    parts.push(
      `## ${i + 1}. ${c.title}`,
      c.fictional ? "教学虚构例子" : c.kind,
      c.body,
      c.takeaway ? `**带走：**${c.takeaway}` : "",
      c.premise ? `**条件与边界：**${c.premise}` : "",
      ...c.visual.items.map((v) => `- ${v.label}：${v.detail}`),
      `图中关系：${c.visual.relation || "并列"}`,
      `来源段落：${c.sourceIds.join("、")}`,
      ...(c.evidence || []).map((e) => `> ${e.quote}（${e.sourceId}）`),
    );
  }
  if (result.study) {
    parts.push(
      "## 全文关系",
      ...result.study.overview.groups.map(
        (g) =>
          `### ${g.title}\n\n${g.description}\n\n${g.chapterIds.map((id) => result.chapters.find((c) => c.id === id).title).join(" / ")}`,
      ),
      ...result.study.overview.connections.map(
        (r) =>
          `${result.chapters.find((c) => c.id === r.from).title} — ${r.label} — ${result.chapters.find((c) => c.id === r.to).title}`,
      ),
      "## 术语",
      ...result.study.glossary.map(
        (g) => `- ${g.term}：${g.explanation}（${g.sourceIds.join("、")}）`,
      ),
      "## 可选互动（教学假设）",
      ...result.study.scenarios.map(
        (s) =>
          `### ${s.title}\n\n${s.setup}\n\n${s.options.map((o) => `**${o.label}**\n\n${o.path.join(" → ")}\n\n${o.explanation}`).join("\n\n")}\n\n${s.takeaway}`,
      ),
      "## 复习卡",
      ...result.chapters.map(
        (c) => `### ${c.recallQuestion}\n\n${c.takeaway}\n\n${c.premise}`,
      ),
      "## 独立听读讲稿",
      ...result.chapters.map((c) => `### ${c.title}\n\n${c.audioNarration}`),
      "## 阅读边界",
      ...result.study.boundaries.map((v) => `- ${v}`),
    );
  }
  if (lesson.studyState?.notes)
    parts.push("## 我的学习笔记", lesson.studyState.notes);
  parts.push("## 带走的判断", ...result.takeaways.map((t) => `- ${t}`));
  if (result.quiz.length)
    parts.push(
      "## 可选自测与解释",
      ...result.quiz.map(
        (q) =>
          `### ${q.question}\n\n${q.options.map((o, i) => `${i + 1}. ${o}`).join("\n")}\n\n参考：${q.options[q.correct]}\n\n${q.explanation}`,
      ),
    );
  parts.push("## 本次学习 Skill", profileMarkdown);
  return parts.filter(Boolean).join("\n\n");
}
