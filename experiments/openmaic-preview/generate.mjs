import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  generateSceneOutlinesFromRequirements,
  generateSceneActions,
  buildCompleteScene,
} from "@openmaic/generation";
import { config } from "../../server/config.mjs";
import { designProfile, modelJSON } from "../../server/model.mjs";
import { sampleText } from "../../server/sample.mjs";
import { defaultAnswers, skillMarkdown } from "../../lib/domain.ts";
import { validateScene } from "./contract.mjs";
import { statisticalSlide, statistics } from "./statistics.mjs";

// This is an isolated, reproducible sample, not a production generation endpoint.
// No credentials, real learner data, or external article bytes go into the bundle.
const cache = new URL("./render/", import.meta.url);
await fs.mkdir(cache, { recursive: true });
const hash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const transcript = [];
const output = new URL("./lesson.json", import.meta.url);
async function aiCall(system, user) {
  const fingerprint = hash([config.model, system, user]);
  const file = new URL(`${fingerprint}.json`, cache);
  try {
    const saved = JSON.parse(await fs.readFile(file, "utf8"));
    transcript.push({ fingerprint, usage: saved.usage, cached: true });
    return saved.content;
  } catch {
    /* Only successful complete provider responses are reusable. */
  }
  const start = Date.now();
  const response = await fetch(`${config.modelBase}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.modelKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      thinking: { type: "disabled" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.45,
      max_tokens: 14000,
    }),
    signal: AbortSignal.timeout(240000),
  });
  if (!response.ok) throw new Error(`Provider status ${response.status}`);
  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content || result.choices[0].finish_reason === "length")
    throw new Error("Incomplete generation");
  const record = {
    content,
    usage: result.usage,
    elapsedMs: Date.now() - start,
  };
  await fs.writeFile(file, JSON.stringify(record));
  transcript.push({
    fingerprint,
    usage: record.usage,
    elapsedMs: record.elapsedMs,
  });
  console.log(
    "Model response complete",
    Math.round(record.elapsedMs / 1000),
    "s",
  );
  return content;
}
if (!config.modelKey)
  throw new Error("Set ZH_ENV_SOURCE or ZH_MODEL_KEY before generating.");
const answers = {
  ...defaultAnswers,
  entry: "story",
  primary: "video",
  pace: "balanced",
  interaction: "none",
  note: "先用生活里的困惑引入。用准确的图表帮助理解，画面少字，不打断提问。",
};
const profileFile = new URL("profile.json", cache);
let profile;
try {
  profile = JSON.parse(await fs.readFile(profileFile, "utf8"));
} catch {
  console.log("Designing the sample learning Skill");
  profile = await designProfile(answers);
  await fs.writeFile(profileFile, JSON.stringify(profile));
}
const skill = skillMarkdown(profile);
const visual = `这是中文知识讲解视频的课件，不是文章分页。16:9，画布 1000×562.5，画面安全边距 55。颜色为背景 #f8fafc、正文 #18253d、主色 #555bd6、辅助 #12a898、强调 #ee7145。只使用 text、shape、line 元素；不使用 image/video/chart/latex、外部资源、表情图案或人物插画。文字标题 36—44px、其余文字 24—32px，最多 7 个中文字的短标签优先。每页只突出一个关系，用真正按数值比例的柱条、数轴、排序标记或算式表达，禁止四页都排列同样的文字卡片。任何数轴或柱状图必须有单位与刻度，柱高不能把 22 与 3 画成相近长度。每页视觉都必须在右下角标注“虚构读书组数据”。`;
const request = {
  requirement: `把下面原文做成恰好 4 页 slide 的连贯中文讲解，不生成 quiz、PBL 或互动页。总讲解约 2 分钟。忠实原文，不引入外部事实。第一页从小林读两本却看见人均六本的困惑开始；后续解释均值的总量分摊、22 对均值的影响、排序中间数以及各指标边界。不要添加考试或作答门槛。\n${visual}\n用户的个人学习 Skill：\n${skill}`,
  webSearch: false,
  interactiveMode: false,
};
console.log("Generating OpenMAIC course outline");
const result = await generateSceneOutlinesFromRequirements(
  request,
  sampleText,
  undefined,
  aiCall,
  { languageDirective: "全部使用简体中文。" },
);
if (
  !result.success ||
  result.data.outlines.length !== 4 ||
  result.data.outlines.some((x) => x.type !== "slide")
)
  throw new Error(
    "Expected exactly four narrated slides, not a different classroom format.",
  );
const outlines = result.data.outlines;
const planFile = new URL("statistical-plan.json", cache);
let plan;
try {
  plan = JSON.parse(await fs.readFile(planFile, "utf8"));
} catch {
  plan = await modelJSON(
    '把原文转成统计讲解的语义计划，只输出JSON：{dataset:{values:number[],unit:string,labels:string[]},frames:[{view:"distribution"|"pool"|"rank"|"summary",title:string,subtitle:string}]}。提取原文真实给出的所有观测值，保持重复值。为四页分别选择 distribution（同一基线的条形比较）、pool（原分布与平均分摊对照）、rank（等宽格子表示排序位置，绝不是数轴）、summary（指标与问题对照），按这四种顺序。标题最多14个汉字，副标题最多25字。保留来源边界，不能把平均数说成错误。',
    { source: sampleText, outlines, skill },
    2000,
  );
  await fs.writeFile(planFile, JSON.stringify(plan));
}
if (
  JSON.stringify(plan.dataset.values) !== "[1,2,2,3,22]" ||
  plan.frames.length !== 4
)
  throw new Error("Extracted dataset does not match the known sample fixture");
// Audited fixture: the source explicitly says Xiao Lin read two books. The
// unnamed observations stay anonymous; do not infer a name from array order.
plan.dataset.labels = ["成员1", "小林", "成员3", "成员4", "成员5"];
const values = statistics(plan.dataset.values);
if (values.total !== 30 || values.mean !== 6 || values.median !== 2)
  throw new Error("Statistics calculation failed");
const scenes = [];
for (let i = 0; i < outlines.length; i++) {
  console.log(`OpenMAIC scene ${i + 1}/4: ${outlines[i].title}`);
  const outline = {
    ...outlines[i],
    description: `${outlines[i].description}\n制作约束：${visual}\n原文：${sampleText}\n学习 Skill：${skill}`,
  };
  const content = statisticalSlide(plan.frames[i], plan.dataset);
  outline.title = plan.frames[i].title;
  outline.description += `\n当前画面语义：${plan.frames[i].view}。${content.remark}`;
  const actions = await generateSceneActions(
    outline,
    content,
    (system, user) =>
      aiCall(
        `${system}\nHOST DELIVERY CONSTRAINT: 仅输出3—4个text条目，总讲稿120—170个汉字。每个text前最多一个spotlight/laser/highlight动作。不能说欢迎来到课堂、同学们好、谢谢大家、下一页；不得要求用户回答。故事自然引入，直接解释，最后给完整结论。不要重复每页的虚构声明，在开头与结尾适度交代。第一张distribution用横向条形，长度代表数值，不称为高柱；pool用竖向柱，高度代表数值；rank是排序格子，不是数轴。中位数是排序中间值，不能说它天然代表多数人或总比平均数好。`,
        user,
      ),
    {
      ctx: {
        pageIndex: i + 1,
        totalPages: 4,
        allTitles: outlines.map((o) => o.title),
        previousSpeeches:
          scenes
            .at(-1)
            ?.actions.filter((a) => a.type === "speech")
            .map((a) => a.text) || [],
      },
      agents: [
        {
          id: "teacher",
          name: "知径",
          role: "teacher",
          persona: "自然、克制、具体地解释知识。",
        },
      ],
      languageDirective: "全部使用简体中文。",
      userProfile: `${skill}\n仅输出 speech 对应的 text 条目，以及 spotlight、laser、highlight 三种 action。每页合计 100—170 个汉字，拆成 3—5 段，每段前指向实际存在的关键图表元素。不要等待用户，不添加讨论、问答、白板、计时或任何其他 action。四页连贯，不反复自我介绍。明确这是虚构数据，不要说平均数错误或中位数万能。`,
    },
  );
  const scene = buildCompleteScene(
    outline,
    content,
    actions,
    "zhijing-openmaic-sample",
    { sceneId: `scene-${i + 1}` },
  );
  validateScene(scene);
  scenes.push(scene);
  await fs.writeFile(
    new URL(`scene-${i + 1}.json`, cache),
    JSON.stringify(scene, null, 2),
  );
}
console.log("Checking the complete lesson against the source");
const review = await modelJSON(
  "独立核对讲稿与原文是否存在实际事实错误，只输出 JSON：{passed:boolean, issues:string[], note:string}。核对数据1/2/2/3/22、总量30、均值6、中位数2、四人不到均值；五人中三人小于等于2、两人恰好等于2。需要说明虚构性、平均数没有算错、中位数不能替代完整分布。不要因为没有重复每页的免责声明而判失败；排序等宽格子表示位置，不是数值刻度。图形数据已由程序核对，图表值不能被讲稿改变。只报告实质错误，不报风格建议。",
  {
    source: sampleText,
    plan,
    speeches: scenes.map((s) => ({
      title: s.title,
      text: s.actions.filter((a) => a.type === "speech").map((a) => a.text),
    })),
  },
  2500,
);
if (!review.passed) {
  await fs.writeFile(
    new URL("review-failed.json", cache),
    JSON.stringify(review, null, 2),
  );
  throw new Error(`Source review failed: ${review.issues.join("; ")}`);
}
await fs.writeFile(
  output,
  JSON.stringify(
    {
      title: "人均六本，为什么四个人都没达到？",
      source: sampleText,
      profile,
      skill,
      scenes,
      review,
      statisticalPlan: plan,
      provenance: {
        generatedAt: new Date().toISOString(),
        sourceHash: hash(sampleText),
        model: config.model,
        generation: "@openmaic/generation@0.3.6",
        renderer: "@openmaic/renderer@0.1.6",
        geometry:
          "Host-computed statistical Slide DSL, after freeform chart generation failed proportional checks",
        mode: "One pre-generated sample, not the production pipeline",
        calls: transcript,
      },
    },
    null,
    2,
  ),
);
console.log("OPENMAIC_SAMPLE_GENERATED", scenes.length);
