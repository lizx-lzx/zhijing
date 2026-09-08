import fs from "node:fs";
import { config, AppError } from "./config.mjs";
import { buildProfile } from "../lib/domain.ts";
import { validateStudy } from "./study-content.mjs";
import { sourceExcerpts } from "./evidence.mjs";
const prompt = (name) =>
  fs.readFileSync(new URL(`./prompts/${name}.md`, import.meta.url), "utf8");
// A bounded repair keeps invalid generations out of saved final content.
export async function validatedJSON(
  name,
  input,
  validate,
  maxTokens,
  generate = modelJSON,
) {
  let data = await generate(prompt(name), input, maxTokens);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return validate(data);
    } catch (error) {
      if (attempt || !(error instanceof AppError)) throw error;
      console.warn(
        "model_contract_repair",
        name,
        error.code,
        "chapters",
        data?.chapters?.length ?? data?.lesson?.chapters?.length ?? "n/a",
        error.details?.invalidReference || "",
      );
      data = await generate(
        prompt(name) +
          "\n上次输出没有通过程序检查。根据 validationFailure 及 details 修复 output，仍返回本提示词要求的完整 JSON（不是差异）。不删掉来源边界，不造引用。若是章节输出则最多 12 章，可合并重复章节，同时保留全部核心概念。",
        {
          ...input,
          validationFailure: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
          output: data,
        },
        maxTokens,
      );
    }
  }
}
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
              content:
                system +
                `\n当前日期（UTC）：${new Date().toISOString().slice(0, 10)}。本任务不是外部事实核查，不用训练记忆判定原文中的事件未发生。未独立核验不等于虚构、未发生或错误；分别保留原文事实陈述、作者推演和教学虚构的身份。\n只输出 JSON，不要 Markdown 围栏。`,
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
export function validateLesson(data, source, complete = false) {
  const ids = new Set(source.blocks.map((b) => b.id));
  if (
    !data ||
    !Array.isArray(data.chapters) ||
    data.chapters.length < 3 ||
    data.chapters.length > 12
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
    ) {
      const error = new AppError(
        "章节或来源不完整，已停止交付，请重试。",
        502,
        "INCOMPLETE_CHAPTER",
      );
      error.details = {
        chapter: i + 1,
        title: c.title,
        receivedSourceIds: c.sourceIds,
        bodyCharacters: text(c.body, 3000).length,
        narrationCharacters: text(c.narration, 1800).length,
        required:
          "每章 body 至少40字、narration至少20字、至少1个真实存在的来源段落编号。虚构故事引用它解释的知识对应原文，不是为虚构人物编造原文。",
      };
      throw error;
    }
    const visual = c.visual || {};
    return {
      id: `s${i + 1}`,
      title: text(c.title, 80),
      kind: text(c.kind, 30),
      body: text(c.body, 3500),
      narration: text(c.narration, 2000),
      sourceIds,
      fictional: c.fictional === true,
      takeaway: text(c.takeaway, 700),
      premise: text(c.premise, 700),
      recallQuestion: text(c.recallQuestion, 400),
      audioNarration: text(c.audioNarration, 2000),
      conceptIds: [
        ...new Set(
          Array.isArray(c.conceptIds)
            ? c.conceptIds.filter((id) => typeof id === "string")
            : [],
        ),
      ],
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
  if (
    complete &&
    chapters.some(
      (c) =>
        !c.takeaway ||
        !c.premise ||
        !c.recallQuestion ||
        c.audioNarration.length < 40 ||
        !c.conceptIds.length ||
        c.visual.items.length < 2 ||
        c.visual.items.some((item) => !item.label || !item.detail),
    )
  )
    throw new AppError(
      "完整学习编排缺少独立讲稿或理解支架，原文已保留，可以重试。",
      502,
      "INCOMPLETE_FORMATS",
    );
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
  const draft = await validatedJSON(
    "compose-lesson",
    { source, analysis, personalSkill: profile },
    (data) => {
      const draft = validateLesson(data, source, true);
      validateCoverage(draft, analysis);
      return draft;
    },
    14000,
  );
  return validatedJSON(
    "verify-lesson",
    {
      source,
      analysis,
      personalSkill: profile,
      lesson: draft,
      sourceExcerpts: sourceExcerpts(source),
    },
    (checked) => validateVerifiedLesson(checked, source, analysis),
    14000,
  );
}
export function validateVerifiedLesson(checked, source, analysis) {
  const final = validateLesson(checked.lesson, source, true);
  validateCoverage(final, analysis);
  const excerpts = new Map(sourceExcerpts(source).map((e) => [e.id, e]));
  const normalize = (s) => s.replace(/\s/g, "");
  for (let i = 0; i < final.chapters.length; i++) {
    const selected = checked.lesson.chapters[i].evidence;
    if (!Array.isArray(selected) || !selected.length)
      throw new AppError(
        "章节证据未通过核对，原文已保留，可以重试。",
        502,
        "EVIDENCE_MISSING",
      );
    const evidence = selected.map((item) => {
      if (!item.excerptId) return item;
      const excerpt = excerpts.get(item.excerptId);
      if (!excerpt || (item.sourceId && excerpt.sourceId !== item.sourceId)) {
        const error = new AppError(
          "原文片段编号未通过核对，可以重试。",
          502,
          "EVIDENCE_REFERENCE_INVALID",
        );
        error.details = {
          chapter: final.chapters[i].id,
          invalidReference: item.excerptId,
          instruction:
            "只从输入 sourceExcerpts 中选择存在且支持本章知识的 id，并保持 sourceId 一致",
        };
        throw error;
      }
      return { sourceId: excerpt.sourceId, quote: excerpt.quote };
    });
    for (const item of evidence) {
      const paragraph = source.blocks.find((b) => b.id === item.sourceId);
      if (
        !paragraph ||
        typeof item.quote !== "string" ||
        normalize(item.quote).length < 12 ||
        !normalize(paragraph.text).includes(normalize(item.quote))
      ) {
        const error = new AppError(
          "引用与原文不匹配，已停止交付，可以重试。",
          502,
          "EVIDENCE_MISMATCH",
        );
        error.details = {
          chapter: final.chapters[i].id,
          sourceId: item.sourceId,
          instruction: "从给定原文段落重新选择逐字摘录，不使用省略号或改写",
        };
        throw error;
      }
    }
    final.chapters[i].sourceIds = [...new Set(evidence.map((e) => e.sourceId))];
    final.chapters[i].evidence = evidence.map((e) => ({
      sourceId: e.sourceId,
      quote: e.quote.slice(0, 600),
    }));
  }
  return final;
}
function validateCoverage(final, analysis) {
  const covered = new Set(final.chapters.flatMap((c) => c.conceptIds));
  const missing = analysis.concepts.filter((c) => !covered.has(c.id));
  if (missing.length) {
    const error = new AppError(
      "部分核心观点还没有得到完整解释，请重试。",
      502,
      "COVERAGE_MISSING",
    );
    error.details = {
      missingConcepts: missing,
      coveredConceptIds: [...covered],
    };
    throw error;
  }
}

export async function composeStudy(source, analysis, profile, lesson) {
  const draft = await validatedJSON(
    "compose-study",
    { source, analysis, personalSkill: profile, lesson },
    (data) => validateStudy(data, lesson, source),
    6500,
  );
  const verified = await validatedJSON(
    "verify-study",
    { source, lesson, personalSkill: profile, study: draft },
    (data) => validateStudy(data.study, lesson, source),
    7500,
  );
  return {
    ...lesson,
    schemaVersion: 2,
    study: verified,
  };
}
