export const playbackRates = [0.75, 1, 1.25, 1.5, 2];

export function clampTime(value, duration) {
  if (!Number.isFinite(value) || !Number.isFinite(duration) || duration <= 0)
    return 0;
  return Math.max(0, Math.min(value, duration - 0.01));
}

export function makeReviewCards(lesson) {
  return lesson.scenes.map((scene) => ({
    id: scene.id,
    question: lesson.learningFormats?.cardQuestions?.[scene.id] || scene.title,
    answer: scene.takeaway,
    premise: scene.premise,
    sourceAnchor: scene.sourceAnchor,
  }));
}

export function validateLearningFormats(lesson) {
  const formats = lesson.learningFormats;
  if (!formats) return;
  const ids = lesson.scenes.map((s) => s.id);
  const mapped = formats.overview.groups.flatMap((g) => g.chapters);
  if (
    mapped.length !== ids.length ||
    new Set(mapped).size !== ids.length ||
    mapped.some((id) => !ids.includes(id))
  )
    throw new Error("Overview must map every chapter exactly once");
  if (!ids.includes(formats.overview.loopChapter))
    throw new Error("Missing loop chapter");
  for (const scenario of formats.scenarios) {
    if (!ids.includes(scenario.chapter) || scenario.options.length < 2)
      throw new Error("Invalid scenario reference or alternatives");
    if (
      new Set(scenario.options.map((o) => o.id)).size !==
      scenario.options.length
    )
      throw new Error("Duplicate scenario options");
    for (const option of scenario.options)
      if (!option.path.length || !option.explanation)
        throw new Error("Incomplete scenario");
  }
  for (const card of makeReviewCards(lesson))
    if (
      !formats.cardQuestions[card.id] ||
      !card.answer ||
      !card.premise ||
      !card.sourceAnchor
    )
      throw new Error(`Incomplete review card: ${card.id}`);
}

export function formatsMarkdown(lesson) {
  const formats = lesson.learningFormats;
  return [
    `# ${lesson.title}｜关系图与互动复习`,
    `原作者：${lesson.author}。原文链接：${lesson.sourceMeta.url}`,
    `> ${lesson.sourceNote}`,
    "## 全文阅读地图",
    formats.overview.note,
    ...formats.overview.groups.map(
      (g) =>
        `### ${g.title}\n\n${g.description}\n\n${g.chapters
          .map((id) => {
            const s = lesson.scenes.find((scene) => scene.id === id);
            return `- ${s.title}：${s.takeaway}`;
          })
          .join("\n")}`,
    ),
    "## 互动推演\n\n以下为改编教学假设，不是经济预测；选择只改变本次演示，不修改学习偏好。",
    ...formats.scenarios.map(
      (s) =>
        `### ${s.title}\n\n${s.setup}\n\n${s.options.map((o) => `**${o.label}**\n\n${o.path.join(" → ")}\n\n${o.explanation}`).join("\n\n")}\n\n带走：${s.takeaway}`,
    ),
    "## 十张复习卡\n\n无需打分，可以直接看答案。",
    ...makeReviewCards(lesson).map(
      (c, i) =>
        `### ${i + 1}. ${c.question}\n\n${c.answer}\n\n成立条件：${c.premise}\n\n> 原文短引（用户提供文本第 ${c.sourceAnchor.startLine} 行）：${c.sourceAnchor.quote}`,
    ),
  ].join("\n\n");
}
