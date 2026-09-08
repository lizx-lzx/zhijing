export type Medium = "video" | "reading" | "audio" | "animation";
export type StudyMode = Medium | "diagrams" | "overview" | "practice";
export type StudyState = {
  mode?: StudyMode;
  chapter?: number;
  videoTime?: number;
  audioTime?: number;
  card?: number;
  scenario?: number;
  answers?: Record<string, string>;
  notes?: string;
  updatedAt?: string;
};
export type Answers = {
  age: string;
  goal: string;
  primary: Medium;
  extras: Medium[];
  entry: string;
  support: string[];
  pace: string;
  interaction: string;
  avoid: string[];
  note: string;
};
export type Rule = {
  id: string;
  title: string;
  instruction: string;
  evidence: string;
};
export type Profile = {
  version: number;
  name: string;
  summary: string;
  answers: Answers;
  rules: Rule[];
  engine: "ai" | "rules";
  updatedAt?: string;
};
export type SourceBlock = { id: string; text: string };
export type Source = {
  id: string;
  title: string;
  url: string;
  mode: string;
  blocks: SourceBlock[];
  createdAt: string;
};
export type Visual = {
  type: "chain" | "compare" | "steps" | "cards";
  items: { label: string; detail: string }[];
  relation: string;
};
export type Chapter = {
  id: string;
  title: string;
  kind: string;
  body: string;
  narration: string;
  sourceIds: string[];
  visual: Visual;
  fictional: boolean;
  takeaway?: string;
  premise?: string;
  recallQuestion?: string;
  audioNarration?: string;
  conceptIds?: string[];
  evidence?: { sourceId: string; quote: string }[];
};
export type StudyContent = {
  version: number;
  overview: {
    title: string;
    groups: { title: string; description: string; chapterIds: string[] }[];
    connections: {
      from: string;
      to: string;
      type: string;
      label: string;
      sourceIds: string[];
    }[];
  };
  glossary: { term: string; explanation: string; sourceIds: string[] }[];
  scenarios: {
    id: string;
    chapterId: string;
    title: string;
    setup: string;
    takeaway: string;
    fictional: boolean;
    sourceIds: string[];
    options: {
      id: string;
      label: string;
      path: string[];
      explanation: string;
    }[];
  }[];
  boundaries: string[];
  practiceNote: string;
};
export type LessonContent = {
  title: string;
  lead: string;
  schemaVersion?: number;
  study?: StudyContent;
  adaptation: string[];
  chapters: Chapter[];
  takeaways: string[];
  quiz: {
    question: string;
    options: string[];
    correct: number;
    explanation: string;
    sourceIds: string[];
  }[];
};
export type Lesson = {
  id: string;
  sourceId: string;
  status: string;
  stage: string;
  progress: number;
  title: string;
  error: string;
  result: LessonContent | null;
  profile: Profile;
  formats: Medium[];
  media: {
    status: string;
    error?: string;
    duration?: number;
    scenes?: { start: number; end: number }[];
    videoReady?: boolean;
    audioReady?: boolean;
    audioFile?: string;
    trackReady?: boolean;
    audioDuration?: number;
    audioScenes?: { start: number; end: number }[];
  };
  createdAt: string;
  completed: boolean;
  updatedAt?: string;
  source?: Source;
  studyState?: StudyState;
};
export type Option = { value: string; label: string; detail: string };
export type Question = {
  id: keyof Answers;
  group: string;
  title: string;
  help?: string;
  multiple?: boolean;
  options: Option[];
};
const options = (rows: string[][]): Option[] =>
  rows.map(([value, label, detail = ""]) => ({ value, label, detail }));
export const mediaLabels: Record<Medium, string> = {
  video: "讲解视频",
  reading: "图文",
  audio: "音频",
  animation: "互动网页",
};
export const defaultAnswers: Answers = {
  age: "private",
  goal: "understand",
  primary: "video",
  extras: [],
  entry: "adaptive",
  support: [],
  pace: "balanced",
  interaction: "none",
  avoid: [],
  note: "",
};
export const questions: Question[] = [
  {
    id: "age",
    group: "认识你的学习习惯",
    title: "先告诉我，你的年龄阶段",
    help: "只帮助选择合适的表达和例子，不判断你的能力。",
    options: options([
      ["18-21", "18—21 岁"],
      ["22-29", "22—29 岁"],
      ["30-39", "30—39 岁"],
      ["40+", "40 岁以上"],
      ["private", "暂不透露"],
    ]),
  },
  {
    id: "goal",
    group: "认识你的学习习惯",
    title: "这次来，你最想获得什么？",
    help: "比如一篇讲 AI、心理学或职场经验的文章。先选一个默认方向，以后可以临时改。",
    options: options([
      ["understand", "先看懂它", "知道它在说什么、为什么。"],
      ["structure", "理清来龙去脉", "把概念、原因和结果联系起来。"],
      ["remember", "记住几个重点", "过几天还能说出核心内容。"],
      ["apply", "知道怎么用", "遇到实际问题时，知道怎么判断或行动。"],
      ["explain", "能讲给别人听", "把观点和依据讲得清楚。"],
    ]),
  },
  {
    id: "primary",
    group: "认识你的学习习惯",
    title: "你更愿意用哪种形式开始？",
    help: "选一个主要形式，也可以加选其他形式。之后随时切换。",
    options: options([
      ["video", "讲解视频", "画面、配音和字幕一起讲。"],
      ["reading", "图文", "自己掌握速度，边看文字边看图。"],
      ["audio", "音频", "用耳朵听，适合散步或通勤。"],
      ["animation", "互动网页", "看变化、点章节，随时停下来。"],
    ]),
  },
  {
    id: "entry",
    group: "找到更容易看懂的讲法",
    title: "同一个知识，你更想听哪种开头？",
    help: "不用判断自己属于什么类型，选更愿意继续看的那种。",
    options: options([
      [
        "story",
        "先听一个故事",
        "“小林只读了两本书，看到人均六本，他有点沮丧……”",
      ],
      [
        "analysis",
        "直接告诉我结论",
        "“平均数不一定代表大多数人。我们用五个数看原因。”",
      ],
      ["map", "先看全貌", "“先看一张图：问题、原因、结果分别是什么。”"],
      [
        "question",
        "从一个问题开始",
        "“为什么五个人中，四个人都没有达到平均水平？”",
      ],
      ["adaptive", "不确定，交给系统", "根据这篇内容选择，不给你固定贴标签。"],
    ]),
  },
  {
    id: "support",
    group: "找到更容易看懂的讲法",
    title: "讲到难点时，怎样帮你更好？",
    help: "可以多选，也可以直接下一步。",
    multiple: true,
    options: options([
      ["plain", "换成大白话", "先解释术语，再继续。"],
      ["example", "给个具体例子", "用一个情境把概念落到实处。"],
      ["analogy", "打一个贴近生活的比方", "同时说清比方在哪些地方不适用。"],
      ["diagram", "画出关系", "把因果、对比或步骤直接摆出来。"],
      ["steps", "拆成小步骤", "一次处理一件事。"],
      ["counterexample", "看看容易误解的地方", "通过反例区分看似相同的概念。"],
    ]),
  },
  {
    id: "pace",
    group: "按你舒服的节奏来",
    title: "什么节奏让你比较舒服？",
    options: options([
      ["compact", "紧凑一点", "先抓关键，补充内容收起来。"],
      ["balanced", "适中就好", "讲清核心，也保留必要的例子。"],
      ["gentle", "慢慢讲清楚", "补足前置知识，难点拆小一些。"],
    ]),
  },
  {
    id: "interaction",
    group: "按你舒服的节奏来",
    title: "要不要留一点参与空间？",
    help: "无论选哪项，完整内容都会直接给你，不答题也能看完。",
    options: options([
      ["none", "直接讲给我听", "不中途提问；练习放在折叠区。"],
      ["end", "最后试一下", "看完后，自愿做一两道小题。"],
      [
        "reflect",
        "留一个思考点",
        "例如“你觉得下一步会发生什么？”答案可直接展开。",
      ],
      ["explore", "让我一起推演", "先给一个情境，你可以选一个判断，再看解释。"],
    ]),
  },
  {
    id: "avoid",
    group: "按你舒服的节奏来",
    title: "你希望我们特别照顾哪些地方？",
    help: "可多选、全选，或者先不选。没有选中的，也会保持清晰好读。",
    multiple: true,
    options: options([
      ["long", "文字短一些"],
      ["dense", "一次不要塞太多信息"],
      ["slow", "少铺垫，快点到重点"],
      ["abstract", "尽量具体，少一些空话"],
      ["questions", "不要频繁提问"],
      ["flashy", "画面克制，不要花哨"],
    ]),
  },
];

export function normalizeAnswers(input: Partial<Answers> = {}): Answers {
  const result = {
    ...defaultAnswers,
    extras: [],
    support: [],
    avoid: [],
  } as Answers;
  for (const q of questions) {
    const valid = new Set(q.options.map((o) => o.value));
    const value = input[q.id];
    if (q.multiple)
      (result[q.id] as string[]) = Array.isArray(value)
        ? [
            ...new Set(
              value.filter((v) => typeof v === "string" && valid.has(v)),
            ),
          ].slice(0, 6)
        : [];
    else if (typeof value === "string" && valid.has(value))
      Object.assign(result, { [q.id]: value });
  }
  result.extras = Array.isArray(input.extras)
    ? [
        ...new Set(
          input.extras.filter(
            (x) => Object.hasOwn(mediaLabels, x) && x !== result.primary,
          ),
        ),
      ].slice(0, 3)
    : [];
  result.note =
    typeof input.note === "string" ? input.note.trim().slice(0, 600) : "";
  return result;
}
export function label(id: keyof Answers, value: string): string {
  return (
    questions.find((q) => q.id === id)?.options.find((o) => o.value === value)
      ?.label || value
  );
}

export function profileForLesson(
  saved: Profile,
  overrides: Partial<Answers> = {},
): Profile {
  const allowed = ["primary", "goal", "entry", "pace"] as const;
  const input = overrides && typeof overrides === "object" ? overrides : {};
  const changes = Object.fromEntries(
    allowed
      .filter((k) => typeof input[k] === "string")
      .map((k) => [k, input[k]]),
  );
  const adjusted = buildProfile({ ...saved.answers, ...changes });
  const changed = new Set<string>(
    allowed
      .filter((k) => adjusted.answers[k] !== saved.answers[k])
      .map((k) => (k === "primary" ? "medium" : k)),
  );
  if (!changed.size) return saved;
  return {
    ...adjusted,
    name: saved.name + " · 本次调整",
    engine: saved.engine,
    rules: adjusted.rules.map((rule) =>
      changed.has(rule.id)
        ? rule
        : saved.rules.find((r) => r.id === rule.id) || rule,
    ),
  };
}

export function buildProfile(input: Partial<Answers>): Profile {
  const a = normalizeAnswers(input);
  const entry: Record<string, string> = {
    story:
      "先用具体人物的处境、感受或矛盾让人愿意继续，再揭示背后的概念和因果。虚构必须明示，不能篡改原文。",
    analysis:
      "开头直接给结论和边界；随后展开依据、推导、反例和使用条件，不加虚构故事铺垫。",
    map: "先呈现中心问题与整体关系，再按关系逐一解释局部；章节顺序应与全局图对应。",
    question:
      "用一个与中心观点直接相关的问题进入；后续每部分补齐回答，不把问题变成看后文的门槛。",
    adaptive:
      "按内容选择最容易进入的解释路径；不得声称已经知道用户对该主题的熟悉程度。",
  };
  const goal: Record<string, string> = {
    understand: "以看懂中心问题、结论和必要依据为目标。",
    structure: "重点组织概念、前置、因果、对比和条件关系。",
    remember: "控制要点数量，提供组块和可选回忆线索，不承诺长期记忆。",
    apply: "结尾给可执行的判断步骤和适用边界，并提供一个迁移情境。",
    explain: "形成可转述的观点链与依据，结尾提供简短讲述提纲。",
  };
  const pace: Record<string, string> = {
    compact: "核心解释紧凑；不重复铺垫。完整保留决定结论成立的条件。",
    balanced: "每章一个核心点，必要例子和依据相邻，不堆砌背景。",
    gentle: "先补足必要前置，术语出现时解释；把推导拆小，慢不等于重复。",
  };
  const rules: Rule[] = [
    {
      id: "medium",
      title: `以${mediaLabels[a.primary]}为主`,
      instruction: `主载体为${mediaLabels[a.primary]}。${a.extras.length ? `同时提供${a.extras.map((m) => mediaLabels[m]).join("、")}。` : "不强迫用户逐篇重新选择形式。"}各载体共用同一知识结构、来源和结论。`,
      evidence: "你选择的主要形式",
    },
    {
      id: "entry",
      title: label("entry", a.entry),
      instruction: entry[a.entry],
      evidence: "你选择的讲法",
    },
    {
      id: "goal",
      title: label("goal", a.goal),
      instruction: goal[a.goal],
      evidence: "你的默认目标",
    },
    {
      id: "support",
      title: a.support.length
        ? a.support.map((s) => label("support", s)).join("、")
        : "难点用具体解释",
      instruction: a.support.length
        ? `难点优先采用：${a.support.map((s) => label("support", s)).join("、")}。类比要说清边界，图必须表达真实关系。`
        : "根据难点选择例子、步骤或图解，不只换措辞重复原话。",
      evidence: a.support.length ? "你选择的帮助" : "系统默认，可修改",
    },
    {
      id: "pace",
      title: label("pace", a.pace),
      instruction: pace[a.pace],
      evidence: "你选择的节奏",
    },
    {
      id: "interaction",
      title: a.avoid.includes("questions")
        ? "不频繁提问"
        : label("interaction", a.interaction),
      instruction:
        a.avoid.includes("questions") || a.interaction === "none"
          ? "所有章节一次性可见；练习折叠，不在中间打断。"
          : a.interaction === "reflect"
            ? "末尾留一个可跳过的预测或解释题，让用户先想一想，再直接查看答案与理由。不阻止查看完整内容。"
            : a.interaction === "explore"
              ? "末尾给可跳过的情境判断题：具体处境、不同判断、每一步推理和适用边界。不阻止查看完整内容。"
              : "末尾提供一两道可跳过的理解检查题，区分相近概念；答案和解释可直接查看。",
      evidence: "互动选择与避免项",
    },
    {
      id: "avoid",
      title: a.avoid.length
        ? a.avoid.map((v) => label("avoid", v)).join("、")
        : "保持清晰克制",
      instruction: a.avoid.length
        ? `明确照顾：${a.avoid.map((v) => label("avoid", v)).join("、")}。不因此删去必要事实与限制条件。`
        : "没有明确避免项，默认清晰、适量、可暂停。",
      evidence: a.avoid.length ? "你的明确要求" : "平台默认",
    },
    {
      id: "boundary",
      title: "保留来源，不给你贴标签",
      instruction: `${a.age === "18-21" ? "案例不预设长期职业经验；" : "使用清晰的成人表达；"}年龄不用于推断能力。区分作者观点、预测与事实；AI解释和虚构例子需标识。一次性交付完整内容；长期规则只经用户确认更新。`,
      evidence: "平台底线",
    },
  ];
  if (a.note)
    rules.push({
      id: "personal",
      title: "你补充的习惯",
      instruction: a.note,
      evidence: "你亲自补充，可编辑",
    });
  return {
    version: 3,
    name: `${label("entry", a.entry)} · ${mediaLabels[a.primary]}`,
    summary: `用${mediaLabels[a.primary]}开始，${label("pace", a.pace)}；重点帮助你${label("goal", a.goal)}。`,
    answers: a,
    rules,
    engine: "rules",
  };
}
export function skillMarkdown(p: Profile): string {
  return `---\nname: personal-learning\ndescription: 当将用户提供的知识内容制作成学习作品时使用；普通问答、没有来源的创作不使用。\nversion: ${p.version}\n---\n\n# ${p.name}\n\n${p.summary}\n\n## 输入与输出\n\n输入为带段落编号的原文，输出为来源可追溯、一次性交付的个人学习作品。没有原文时停止，不编造。\n\n## 学习规则\n\n${p.rules.map((r) => `### ${r.title}\n\n${r.instruction}\n\n依据：${r.evidence}`).join("\n\n")}\n\n## 验收\n\n核心观点与来源一致；讲解入口、组织顺序和支架执行上述规则；练习可跳过；生成失败必须如实说明。偏好不是经过验证的能力诊断。\n`;
}
