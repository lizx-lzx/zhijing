import fs from "node:fs";
import { config, AppError } from "./config.mjs";
import { buildProfile } from "../lib/domain.ts";
const prompt = (name) =>
  fs.readFileSync(new URL(`./prompts/${name}.md`, import.meta.url), "utf8");
export async function modelJSON(system, input, maxTokens = 6000) {
  if (!config.modelKey)
    throw new AppError(
      "内容生成服务尚未配置，请联系平台维护者。",
      503,
      "MODEL_UNAVAILABLE",
    );
  for (let attempt = 0; attempt < 2; attempt++) {
    let response;
    try {
      response = await fetch(`${config.modelBase}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.modelKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            {
              role: "system",
              content: system + "\n只输出 JSON，不要 Markdown 围栏。",
            },
            { role: "user", content: JSON.stringify(input) },
          ],
          response_format: { type: "json_object" },
          thinking: { type: "disabled" },
          temperature: 0.55,
          max_tokens: maxTokens,
        }),
        signal: AbortSignal.timeout(160000),
      });
    } catch {
      throw new AppError(
        "生成服务暂时未响应，内容已保留，可以重试。",
        502,
        "MODEL_TIMEOUT",
      );
    }
    if (!response.ok) {
      if (attempt === 0 && [429, 502, 503, 504].includes(response.status))
        continue;
      throw new AppError(
        "生成服务暂时不可用，内容已保留，可以重试。",
        502,
        "MODEL_ERROR",
      );
    }
    const data = await response.json();
    if (data.choices?.[0]?.finish_reason === "length") {
      if (!attempt) {
        maxTokens = Math.min(maxTokens + 4000, 14000);
        continue;
      }
      throw new AppError(
        "生成内容不完整，请重试。",
        502,
        "INCOMPLETE_GENERATION",
      );
    }
    try {
      return JSON.parse(data.choices[0].message.content);
    } catch {
      if (attempt)
        throw new AppError(
          "生成内容格式未通过检查，请重试。",
          502,
          "INVALID_GENERATION",
        );
    }
  }
}
export async function designProfile(answers) {
  const base = buildProfile(answers);
  const generated = await modelJSON(
    prompt("design-learning-skill"),
    { answers: base.answers, skeleton: base },
    2600,
  );
  const editable = new Set(["entry", "goal", "support", "pace"]);
  if (!Array.isArray(generated.rules) || typeof generated.summary !== "string")
    throw new AppError("个人规则生成不完整，请重试。", 502);
  return {
    ...base,
    name: String(generated.name || base.name).slice(0, 50),
    summary: generated.summary.slice(0, 200),
    engine: "ai",
    rules: base.rules.map((r) => {
      const m = generated.rules.find((x) => x.id === r.id);
      return editable.has(r.id) &&
        typeof m?.instruction === "string" &&
        m.instruction.length > 15
        ? { ...r, instruction: m.instruction.slice(0, 1500) }
        : r;
    }),
  };
}
export async function analyzeContent(source) {
  const result = await modelJSON(prompt("analyze-content"), source, 4800);
  const ids = new Set(source.blocks.map((b) => b.id));
  if (!Array.isArray(result.concepts) || result.concepts.length < 2)
    throw new AppError(
      "未能提取足够的知识结构，请确认正文是否完整。",
      422,
      "SOURCE_TOO_THIN",
    );
  result.concepts = result.concepts.slice(0, 16).map((c) => ({
    ...c,
    sourceIds: (Array.isArray(c.sourceIds) ? c.sourceIds : []).filter((id) =>
      ids.has(id),
    ),
  }));
  if (result.concepts.some((c) => !c.sourceIds.length))
    throw new AppError(
      "内容结构未能对应原文，请重试。",
      502,
      "SOURCE_ANCHOR_ERROR",
    );
  return result;
}
const text = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
export function validateLesson(data, source) {
  const ids = new Set(source.blocks.map((b) => b.id));
  if (
    !data ||
    !Array.isArray(data.chapters) ||
    data.chapters.length < 3 ||
    data.chapters.length > 10
  )
    throw new AppError("章节结构没有通过检查，请重试。", 502, "INVALID_LESSON");
  const chapters = data.chapters.map((c, i) => {
    const sourceIds = [
      ...new Set(
        (Array.isArray(c.sourceIds) ? c.sourceIds : []).filter((id) =>
          ids.has(id),
        ),
      ),
    ];
    if (
      !sourceIds.length ||
      text(c.body, 3000).length < 40 ||
      text(c.narration, 1800).length < 20
    )
      throw new AppError(
        "章节或来源不完整，已停止交付，请重试。",
        502,
        "INCOMPLETE_CHAPTER",
      );
    const visual = c.visual || {};
    return {
      id: `s${i + 1}`,
      title: text(c.title, 80),
      kind: text(c.kind, 30),
      body: text(c.body, 3500),
      narration: text(c.narration, 2000),
      sourceIds,
      fictional: c.fictional === true,
      visual: {
        type: ["chain", "compare", "steps", "cards"].includes(visual.type)
          ? visual.type
          : "cards",
        relation: text(visual.relation, 40),
        items: (Array.isArray(visual.items) ? visual.items : [])
          .slice(0, 4)
          .map((v) => ({
            label: text(v.label, 35),
            detail: text(v.detail, 110),
          })),
      },
    };
  });
  const quiz = (Array.isArray(data.quiz) ? data.quiz : [])
    .slice(0, 2)
    .filter(
      (q) =>
        Array.isArray(q.options) &&
        q.options.length >= 2 &&
        q.options.length <= 4 &&
        Number.isInteger(q.correct) &&
        q.correct >= 0 &&
        q.correct < q.options.length,
    )
    .map((q) => ({
      question: text(q.question, 500),
      options: q.options.map((v) => text(v, 300)),
      correct: q.correct,
      explanation: text(q.explanation, 1000),
      sourceIds: (q.sourceIds || []).filter((id) => ids.has(id)),
    }));
  return {
    title: text(data.title, 120) || source.title,
    lead: text(data.lead, 500),
    adaptation: (Array.isArray(data.adaptation) ? data.adaptation : [])
      .slice(0, 4)
      .map((v) => text(v, 300)),
    chapters,
    takeaways: (Array.isArray(data.takeaways) ? data.takeaways : [])
      .slice(0, 6)
      .map((v) => text(v, 500)),
    quiz,
  };
}
export async function composeLesson(source, analysis, profile) {
  const data = await modelJSON(
    prompt("compose-lesson"),
    { source, analysis, personalSkill: profile },
    11000,
  );
  const draft = validateLesson(data, source);
  const checked = await modelJSON(
    prompt("verify-lesson"),
    { source, personalSkill: profile, lesson: draft },
    13000,
  );
  const final = validateLesson(checked.lesson, source);
  const normalize = (s) => s.replace(/\s/g, "");
  for (let i = 0; i < final.chapters.length; i++) {
    const evidence = checked.lesson.chapters[i].evidence;
    if (!Array.isArray(evidence) || !evidence.length)
      throw new AppError(
        "章节证据未通过核对，原文已保留，可以重试。",
        502,
        "EVIDENCE_MISSING",
      );
    for (const item of evidence) {
      const paragraph = source.blocks.find((b) => b.id === item.sourceId);
      if (
        !paragraph ||
        typeof item.quote !== "string" ||
        normalize(item.quote).length < 12 ||
        !normalize(paragraph.text).includes(normalize(item.quote))
      )
        throw new AppError(
          "引用与原文不匹配，已停止交付，可以重试。",
          502,
          "EVIDENCE_MISMATCH",
        );
    }
    final.chapters[i].sourceIds = [...new Set(evidence.map((e) => e.sourceId))];
  }
  return final;
}
