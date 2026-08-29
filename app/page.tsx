"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Compass,
  FileText,
  Gauge,
  Layers3,
  Lightbulb,
  Link2,
  Map,
  MessageCircle,
  Play,
  RefreshCcw,
  Route,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type View =
  | "landing"
  | "questionnaire"
  | "style-test"
  | "skill-result"
  | "workspace"
  | "learning";

type Question = {
  id: string;
  eyebrow: string;
  title: string;
  hint: string;
  options: Array<{ label: string; detail: string }>;
};

const questions: Question[] = [
  {
    id: "age",
    eyebrow: "基础情况",
    title: "你现在处于哪个年龄阶段？",
    hint: "只用于调整语言、案例和信息密度，不会判断你的能力。",
    options: [
      { label: "18—21 岁", detail: "正在建立自己的知识坐标" },
      { label: "22—29 岁", detail: "学习常与工作、表达和成长相连" },
      { label: "30—39 岁", detail: "更重视效率、结构和实际应用" },
      { label: "40 岁以上", detail: "更看重经验连接与长期价值" },
      { label: "暂不透露", detail: "保持通用的成人学习表达" },
    ],
  },
  {
    id: "goal",
    eyebrow: "学习结果",
    title: "读完一篇重要内容后，你最希望得到什么？",
    hint: "选择你最常见的目标，具体学习时仍然可以临时改变。",
    options: [
      { label: "快速看懂", detail: "尽快抓住问题和结论" },
      { label: "形成结构", detail: "看见概念之间怎样连接" },
      { label: "记住重点", detail: "留下可以回忆的关键抓手" },
      { label: "学会应用", detail: "能够把知识带回真实问题" },
      { label: "讲给别人", detail: "形成自己的表达和判断" },
    ],
  },
  {
    id: "entry",
    eyebrow: "进入方式",
    title: "面对一个陌生主题，你更愿意从哪里开始？",
    hint: "没有正确答案，我们在寻找更自然的第一步。",
    options: [
      { label: "先看全局地图", detail: "先知道全貌，再进入细节" },
      { label: "先看真实案例", detail: "从具体的人与事情开始" },
      { label: "先听一个故事", detail: "通过情境和情绪建立感觉" },
      { label: "先带着问题", detail: "在寻找答案的过程中理解" },
      { label: "先把定义说清", detail: "从准确概念逐步展开" },
    ],
  },
  {
    id: "medium",
    eyebrow: "表达媒介",
    title: "哪种形式最容易让你愿意继续学下去？",
    hint: "这是默认入口，不代表以后只使用这一种形式。",
    options: [
      { label: "图文与关系图", detail: "把抽象结构变得可见" },
      { label: "短视频讲解", detail: "用画面、声音和节奏带入" },
      { label: "音频陪伴", detail: "适合走路、通勤或放松时听" },
      { label: "互动推演", detail: "通过选择和反馈逐步理解" },
      { label: "清晰的文字", detail: "安静、准确地深入阅读" },
    ],
  },
  {
    id: "interaction",
    eyebrow: "参与程度",
    title: "学习过程中，你希望平台怎样与你互动？",
    hint: "提问不是强制考试，只用来帮助你停下来形成理解。",
    options: [
      { label: "直接讲清楚", detail: "尽量少打断我的思路" },
      { label: "偶尔确认一下", detail: "每个阶段一个轻问题" },
      { label: "边学边回答", detail: "用反馈帮我发现盲区" },
      { label: "一起推演", detail: "像和一个思考伙伴对话" },
    ],
  },
  {
    id: "avoid",
    eyebrow: "避免事项",
    title: "哪种情况最容易让你中途退出？",
    hint: "平台会把它作为优先避免的条件。",
    options: [
      { label: "连续大段文字", detail: "看了一会儿就失去注意力" },
      { label: "信息密度太高", detail: "还没消化就不断出现新概念" },
      { label: "解释节奏太慢", detail: "一直没有进入真正的问题" },
      { label: "内容过度抽象", detail: "缺少例子、画面和现实连接" },
      { label: "频繁被提问", detail: "互动太多反而打断理解" },
      { label: "形式太花哨", detail: "注意力被效果带离内容" },
    ],
  },
];

const sampleUrl =
  "https://zhuanlan.zhihu.com/p/2037864292129530950";

const recipeGoals = ["快速看懂", "形成结构", "深入掌握", "学会应用"];
const recipeTimes = ["5 分钟", "15 分钟", "不限制"];

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="知径个性化学习平台">
      <span className="brand-mark">径</span>
      {!compact && (
        <span className="brand-copy">
          <strong>知径</strong>
          <small>个性化学习平台</small>
        </span>
      )}
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="pill">{children}</span>;
}

export default function Home() {
  const [view, setView] = useState<View>("landing");
  const [hasProfile, setHasProfile] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [styleStage, setStyleStage] = useState(0);
  const [styleChoice, setStyleChoice] = useState<"map" | "story" | "">("");
  const [styleAnswer, setStyleAnswer] = useState("");
  const [articleUrl, setArticleUrl] = useState("");
  const [sourceReady, setSourceReady] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [goal, setGoal] = useState("形成结构");
  const [time, setTime] = useState("15 分钟");
  const [explanationMode, setExplanationMode] = useState<"map" | "story">(
    "map",
  );
  const [knowledgeAnswer, setKnowledgeAnswer] = useState("");
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const profile = window.localStorage.getItem("zhijing-learning-profile");
      const savedCompleted = window.localStorage.getItem(
        "zhijing-sample-completed",
      );
      setHasProfile(Boolean(profile));
      setCompleted(savedCompleted === "true");
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const currentQuestion = questions[questionIndex];
  const progress = Math.round(((questionIndex + 1) / questions.length) * 72);

  const skillTraits = useMemo(
    () => [
      {
        icon: Map,
        label: "知识入口",
        value: answers.entry || "先看全局地图",
        detail: styleChoice === "story" ? "情境辅助进入" : "关系优先呈现",
      },
      {
        icon: Layers3,
        label: "主要表达",
        value: answers.medium || "图文与关系图",
        detail: "媒体服务于内容结构",
      },
      {
        icon: Gauge,
        label: "理解节奏",
        value: answers.goal || "形成结构",
        detail: "中等颗粒度，逐层展开",
      },
      {
        icon: MessageCircle,
        label: "参与方式",
        value: answers.interaction || "偶尔确认一下",
        detail: "不强制答题或复述",
      },
    ],
    [answers, styleChoice],
  );

  function beginProfile() {
    setQuestionIndex(0);
    setAnswers({});
    setStyleStage(0);
    setStyleChoice("");
    setStyleAnswer("");
    setView("questionnaire");
  }

  function chooseAnswer(value: string) {
    setAnswers((previous) => ({
      ...previous,
      [currentQuestion.id]: value,
    }));
  }

  function nextQuestion() {
    if (!answers[currentQuestion.id]) return;
    if (questionIndex === questions.length - 1) {
      setView("style-test");
      return;
    }
    setQuestionIndex((index) => index + 1);
  }

  function previousQuestion() {
    if (questionIndex === 0) {
      setView("landing");
      return;
    }
    setQuestionIndex((index) => index - 1);
  }

  function saveProfile() {
    window.localStorage.setItem(
      "zhijing-learning-profile",
      JSON.stringify({ answers, styleChoice, styleAnswer, version: 1 }),
    );
    setHasProfile(true);
    setView("workspace");
  }

  function resetProfile() {
    window.localStorage.removeItem("zhijing-learning-profile");
    setHasProfile(false);
    beginProfile();
  }

  function analyzeSource() {
    if (!articleUrl.trim()) return;
    setIsAnalyzing(true);
    setSourceReady(false);
    window.setTimeout(() => {
      setIsAnalyzing(false);
      setSourceReady(true);
    }, 850);
  }

  function startLearning() {
    setIsGenerating(true);
    window.setTimeout(() => {
      setIsGenerating(false);
      setView("learning");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 1100);
  }

  function completeLearning() {
    window.localStorage.setItem("zhijing-sample-completed", "true");
    setCompleted(true);
  }

  if (view === "landing") {
    return (
      <main className="site-shell landing-page page-enter">
        <nav className="public-nav container">
          <Brand />
          {hasProfile ? (
            <button className="button button-quiet" onClick={() => setView("workspace")}>
              进入我的工作台 <ArrowRight size={16} />
            </button>
          ) : (
            <span className="nav-note">一次建档，以后直接学习</span>
          )}
        </nav>

        <section className="hero container">
          <div className="hero-copy">
            <Pill>
              <Sparkles size={14} /> 为每个人重新组织知识
            </Pill>
            <h1>
              先认识你，
              <br />
              再为你<span>讲知识。</span>
            </h1>
            <p>
              用一次轻量适配，形成专属于你的学习方式。以后每一篇文章，
              都会按你更容易进入、理解和应用的路径重新展开。
            </p>
            <div className="hero-actions">
              <button className="button button-primary button-large" onClick={beginProfile}>
                开始了解我的学习方式 <ArrowRight size={18} />
              </button>
              <span><Clock3 size={15} /> 大约 3 分钟，只需完成一次</span>
            </div>
            <div className="trust-row">
              <span><ShieldCheck size={17} /> 不贴固定类型标签</span>
              <span><RefreshCcw size={17} /> 随时可以重新适配</span>
            </div>
          </div>

          <div className="hero-visual" aria-label="个性化学习方式预览">
            <div className="orb orb-one" />
            <div className="orb orb-two" />
            <div className="profile-card main-profile-card">
              <div className="card-kicker">
                <BrainCircuit size={17} /> 你的学习方式初稿
                <span>v1</span>
              </div>
              <h3>整体地图先行，情境帮助进入</h3>
              <p>面对抽象内容，先让关系可见，再逐层展开解释。</p>
              <div className="trait-list">
                <div><Map size={16} /><span>全局结构</span><strong>优先</strong></div>
                <div><Layers3 size={16} /><span>图文配合</span><strong>主要</strong></div>
                <div><MessageCircle size={16} /><span>轻量互动</span><strong>适中</strong></div>
              </div>
            </div>
            <div className="floating-card floating-top">
              <span className="mini-icon amber"><Lightbulb size={16} /></span>
              <div><small>进入方式</small><strong>先看真实问题</strong></div>
            </div>
            <div className="floating-card floating-bottom">
              <span className="mini-icon green"><Route size={16} /></span>
              <div><small>今日配方</small><strong>图解＋案例 · 12 分钟</strong></div>
            </div>
          </div>
        </section>

        <section className="how-it-works container">
          <div className="section-heading">
            <span>不是换一种格式</span>
            <h2>而是为你重建一条理解路径</h2>
          </div>
          <div className="steps-grid">
            <article>
              <span>01</span><BrainCircuit size={22} />
              <h3>认识你的方式</h3>
              <p>结合简短问卷和真实 Style 体验，形成可修改的个人学习 Skill。</p>
            </article>
            <article>
              <span>02</span><Link2 size={22} />
              <h3>交给我们一篇内容</h3>
              <p>第一阶段支持知乎公开文章，后续再扩展更多来源。</p>
            </article>
            <article>
              <span>03</span><WandSparkles size={22} />
              <h3>开始你的学习版本</h3>
              <p>知识顺序、解释方式、媒体和互动共同组成一件完整学习作品。</p>
            </article>
          </div>
        </section>
      </main>
    );
  }

  if (view === "questionnaire") {
    return (
      <main className="onboarding-shell page-enter">
        <header className="onboarding-header container-narrow">
          <Brand />
          <span>个人学习建档</span>
        </header>
        <div className="progress-track" aria-label={`问卷进度 ${progress}%`}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <section className="question-wrap container-narrow">
          <button className="back-button" onClick={previousQuestion} aria-label="返回上一题">
            <ArrowLeft size={18} />
          </button>
          <div className="question-meta">
            <span>{currentQuestion.eyebrow}</span>
            <strong>{questionIndex + 1} / {questions.length}</strong>
          </div>
          <h1>{currentQuestion.title}</h1>
          <p className="question-hint">{currentQuestion.hint}</p>
          <div className="option-grid">
            {currentQuestion.options.map((option) => {
              const selected = answers[currentQuestion.id] === option.label;
              return (
                <button
                  className={`option-card ${selected ? "selected" : ""}`}
                  key={option.label}
                  onClick={() => chooseAnswer(option.label)}
                  aria-pressed={selected}
                >
                  <span className="radio-dot">{selected && <Check size={14} />}</span>
                  <span><strong>{option.label}</strong><small>{option.detail}</small></span>
                </button>
              );
            })}
          </div>
          <div className="question-footer">
            <span>没有标准答案，选择更接近你的那一个。</span>
            <button
              className="button button-primary"
              onClick={nextQuestion}
              disabled={!answers[currentQuestion.id]}
            >
              {questionIndex === questions.length - 1 ? "进入体验测试" : "下一题"}
              <ArrowRight size={17} />
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (view === "style-test") {
    return (
      <main className="onboarding-shell style-shell page-enter">
        <header className="onboarding-header container-narrow">
          <Brand />
          <span>Style 微型体验</span>
        </header>
        <div className="progress-track"><span style={{ width: styleStage === 0 ? "84%" : "94%" }} /></div>
        <section className="style-wrap container-wide">
          <div className="style-heading">
            <Pill><Sparkles size={14} /> 不只问你喜欢什么</Pill>
            <h1>{styleStage === 0 ? "同一个概念，哪种方式让你更容易进入？" : "用一个小问题确认刚才的理解"}</h1>
            <p>{styleStage === 0 ? "下面都在解释“公地困境”。读完后选择更想继续的一种。" : "这不是考试，只帮助平台区分“喜欢”和“理解”。"}</p>
          </div>

          {styleStage === 0 ? (
            <>
              <div className="style-comparison">
                <button
                  className={`style-card ${styleChoice === "map" ? "selected" : ""}`}
                  onClick={() => setStyleChoice("map")}
                >
                  <div className="style-card-top"><span>方式 A · 关系图</span>{styleChoice === "map" && <CheckCircle2 size={20} />}</div>
                  <div className="commons-map">
                    <span className="map-node people">每个人<br />多取一点</span>
                    <span className="map-arrow">→</span>
                    <span className="map-node resource">公共资源<br />持续减少</span>
                    <span className="map-arrow">→</span>
                    <span className="map-node result">所有人<br />一起受损</span>
                  </div>
                  <p>个人眼前的合理选择叠加起来，可能造成所有人都不愿看到的长期结果。</p>
                  <span className="choose-label">这种更容易理解</span>
                </button>

                <button
                  className={`style-card story-card ${styleChoice === "story" ? "selected" : ""}`}
                  onClick={() => setStyleChoice("story")}
                >
                  <div className="style-card-top"><span>方式 B · 情境故事</span>{styleChoice === "story" && <CheckCircle2 size={20} />}</div>
                  <div className="story-scene">
                    <span className="story-number">“</span>
                    <p>村里有一片所有牧民共享的草场。多放一只羊，收益归自己；草场的损耗，却由所有人共同承担。于是每个人都多放一点，直到草场再也承受不住。</p>
                  </div>
                  <p>问题不一定来自某个人的恶意，而可能来自规则让每个人都倾向眼前收益。</p>
                  <span className="choose-label">这种更容易理解</span>
                </button>
              </div>
              <div className="style-footer">
                <span><CircleHelp size={16} /> 系统会把你的选择与下一步理解结果结合。</span>
                <button className="button button-primary" disabled={!styleChoice} onClick={() => setStyleStage(1)}>
                  继续 <ArrowRight size={17} />
                </button>
              </div>
            </>
          ) : (
            <div className="check-card">
              <div className="check-icon"><Lightbulb size={24} /></div>
              <h2>如果每个人只追求眼前收益，最可能发生什么？</h2>
              <div className="check-options">
                {["公共资源会自动变多", "个人获益，但长期共同受损", "只要没有恶意就不会有问题"].map((answer) => (
                  <button
                    key={answer}
                    className={styleAnswer === answer ? "selected" : ""}
                    onClick={() => setStyleAnswer(answer)}
                  >
                    <span className="radio-dot">{styleAnswer === answer && <Check size={14} />}</span>
                    {answer}
                  </button>
                ))}
              </div>
              {styleAnswer && (
                <div className={`answer-note ${styleAnswer === "个人获益，但长期共同受损" ? "correct" : "gentle"}`}>
                  {styleAnswer === "个人获益，但长期共同受损"
                    ? "理解到了关键关系：局部合理不一定带来整体合理。"
                    : "没关系，这也说明平台需要提供更清楚的关系和例子。"}
                </div>
              )}
              <button className="button button-primary button-large" disabled={!styleAnswer} onClick={() => setView("skill-result")}>
                生成我的学习 Skill <WandSparkles size={18} />
              </button>
            </div>
          )}
        </section>
      </main>
    );
  }

  if (view === "skill-result") {
    return (
      <main className="result-shell page-enter">
        <header className="onboarding-header container-wide">
          <Brand />
          <span>个人学习 Skill · v1</span>
        </header>
        <section className="result-wrap container-wide">
          <div className="result-intro">
            <div className="success-mark"><Check size={28} /></div>
            <Pill>这是我们目前对你的理解</Pill>
            <h1>你的学习方式初稿，已经准备好了。</h1>
            <p>它不是固定标签。平台会先按这套方式组织内容，你可以随时修正。</p>
          </div>

          <div className="skill-summary-card">
            <div className="skill-summary-head">
              <div><small>核心策略</small><h2>整体关系先行，具体情境帮助进入</h2></div>
              <span className="version-badge">Skill v1</span>
            </div>
            <p className="skill-lead">
              面对陌生和抽象内容时，先给你一张可见的知识地图，再用案例连接现实；默认保持中等节奏，避免{answers.avoid || "连续的大段说明"}。
            </p>
            <div className="skill-traits">
              {skillTraits.map(({ icon: Icon, label, value, detail }) => (
                <article key={label}>
                  <span className="trait-icon"><Icon size={19} /></span>
                  <small>{label}</small>
                  <strong>{value}</strong>
                  <p>{detail}</p>
                </article>
              ))}
            </div>
            <div className="evidence-row">
              <span><CheckCircle2 size={17} /> 来自 6 项问卷回答</span>
              <span><CheckCircle2 size={17} /> 已结合 1 次实际 Style 体验</span>
              <span><RefreshCcw size={17} /> 后续只在你确认时更新</span>
            </div>
          </div>

          <div className="result-actions">
            <button className="button button-quiet" onClick={() => setView("questionnaire")}>有一点不准确</button>
            <button className="button button-primary button-large" onClick={saveProfile}>
              进入我的学习工作台 <ArrowRight size={18} />
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (view === "workspace") {
    return (
      <main className="workspace-shell page-enter">
        <aside className="sidebar">
          <Brand />
          <nav className="side-nav" aria-label="工作台导航">
            <button className="active"><Compass size={18} /> 学习工作台</button>
            <button><BookOpen size={18} /> 最近学习</button>
            <button><BrainCircuit size={18} /> 我的学习 Skill</button>
          </nav>
          <div className="side-profile">
            <span className="avatar">L</span>
            <div><strong>我的学习方式</strong><small>整体地图 · 轻互动</small></div>
            <ChevronRight size={16} />
          </div>
        </aside>

        <section className="workspace-main">
          <header className="workspace-topbar">
            <div className="mobile-brand"><Brand compact /></div>
            <span className="profile-status"><span /> 个人 Skill 已启用</span>
            <button className="text-button" onClick={resetProfile}><RefreshCcw size={15} /> 重新适配</button>
          </header>

          <div className="workspace-content">
            <div className="workspace-welcome">
              <Pill><Sparkles size={14} /> 为你重新组织知识</Pill>
              <h1>今天想学什么？</h1>
              <p>先从一篇值得认真理解的知乎文章开始。</p>
            </div>

            <div className="input-card">
              <div className="url-input-wrap">
                <Link2 size={21} />
                <input
                  value={articleUrl}
                  onChange={(event) => {
                    setArticleUrl(event.target.value);
                    setSourceReady(false);
                  }}
                  onKeyDown={(event) => event.key === "Enter" && analyzeSource()}
                  placeholder="粘贴知乎文章链接…"
                  aria-label="知乎文章链接"
                />
                <button className="button button-primary" onClick={analyzeSource} disabled={!articleUrl.trim() || isAnalyzing}>
                  {isAnalyzing ? "正在识别" : "理解这篇文章"}
                  {!isAnalyzing && <ArrowRight size={17} />}
                </button>
              </div>
              <div className="input-helper">
                <button onClick={() => { setArticleUrl(sampleUrl); setSourceReady(false); }}>
                  <Play size={14} /> 使用演示文章
                </button>
                <span>当前版本以演示内容呈现流程，不会伪装成真实抓取结果。</span>
              </div>
              {isAnalyzing && (
                <div className="analyzing-line"><span /><p>正在识别来源、长度与知识结构…</p></div>
              )}
            </div>

            {sourceReady && (
              <div className="source-and-recipe page-enter">
                <article className="source-card">
                  <span className="source-icon"><FileText size={21} /></span>
                  <div>
                    <small>知乎专栏 · 公开文章</small>
                    <h3>{articleUrl.includes("2037864292129530950") ? "人生样本库｜知乎 Hackathon 2026 项目推荐" : "你提供的知乎文章"}</h3>
                    <p>原型已识别链接。真实正文、作者与来源锚点将在内容接口接入后读取。</p>
                    <div><span>预计原文阅读 18 分钟</span><span>知识型长文</span></div>
                  </div>
                  <CheckCircle2 className="source-check" size={22} />
                </article>

                <section className="recipe-panel">
                  <div className="recipe-heading">
                    <div><span>本次学习条件</span><h2>只需要告诉我这一次想怎么学</h2></div>
                    <span className="recommend-label"><Sparkles size={14} /> 已调用个人 Skill</span>
                  </div>
                  <div className="recipe-choices">
                    <fieldset><legend>这次的目标</legend><div>{recipeGoals.map((item) => <button key={item} className={goal === item ? "active" : ""} onClick={() => setGoal(item)}>{item}</button>)}</div></fieldset>
                    <fieldset><legend>现在有多少时间</legend><div>{recipeTimes.map((item) => <button key={item} className={time === item ? "active" : ""} onClick={() => setTime(item)}>{item}</button>)}</div></fieldset>
                  </div>
                  <div className="recommended-recipe">
                    <span className="recipe-orb"><Route size={22} /></span>
                    <div><small>为你推荐的学习配方</small><h3>真实问题进入＋关系图解＋一次应用推演</h3><p>{time === "5 分钟" ? "约 5 分钟，先建立最小可用理解。" : "约 12 分钟，重点形成全文结构并理解关键关系。"}</p></div>
                    <button className="button button-primary button-large" onClick={startLearning} disabled={isGenerating}>
                      {isGenerating ? "正在搭建学习路径…" : "按这个方式开始"}
                      {!isGenerating && <ArrowRight size={18} />}
                    </button>
                  </div>
                </section>
              </div>
            )}

            {!sourceReady && (
              <section className="workspace-lower">
                {completed && (
                  <button type="button" className="continue-card" onClick={() => setView("learning")}>
                    <div className="continue-thumb"><Route size={26} /></div>
                    <div><small>最近学习</small><h3>人生样本库｜个性化学习版本</h3><p>图解＋案例 · 已完成</p></div>
                    <span><CheckCircle2 size={17} /> 已学完</span>
                  </button>
                )}
                <div className="mini-process">
                  <div><span>1</span><strong>交付内容</strong><small>一篇你真正想懂的文章</small></div>
                  <div><span>2</span><strong>自动编排</strong><small>结合你的个人学习 Skill</small></div>
                  <div><span>3</span><strong>开始学习</strong><small>得到连续而完整的体验</small></div>
                </div>
              </section>
            )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="learning-shell page-enter">
      <header className="learning-topbar">
        <Brand />
        <div className="learning-top-actions">
          <span><Clock3 size={15} /> 预计 12 分钟</span>
          <button className="button button-quiet" onClick={() => setView("workspace")}><ArrowLeft size={16} /> 返回工作台</button>
        </div>
      </header>

      <div className="learning-layout container-learning">
        <aside className="lesson-nav">
          <span className="lesson-label">学习路径</span>
          <nav>
            <a className="active" href="#question"><span>01</span>先看真正的问题</a>
            <a href="#map"><span>02</span>建立整体关系</a>
            <a href="#explain"><span>03</span>换一种方式理解</a>
            <a href="#apply"><span>04</span>做一次应用判断</a>
          </nav>
          <div className="lesson-progress"><span>学习进度</span><strong>{completed ? "100%" : "35%"}</strong><div><i style={{ width: completed ? "100%" : "35%" }} /></div></div>
        </aside>

        <article className="lesson-content">
          <div className="prototype-notice">
            <ShieldCheck size={17} />
            <span><strong>交互原型说明：</strong>下面演示学习路径和个性化呈现；尚未接入知乎正文解析，示例文字不代表原文内容。</span>
          </div>

          <header className="lesson-hero" id="question">
            <div className="lesson-meta"><span>你的学习版本</span><span>形成结构</span><span>图解＋案例</span></div>
            <h1>真正稀缺的，可能不是更多信息，而是一条适合自己的理解路径。</h1>
            <p>先不急着进入细节。我们用一张地图看清：一段原始内容，怎样转化成一次真正发生的学习。</p>
          </header>

          <section className="lesson-section" id="map">
            <div className="section-number">01 · 整体关系</div>
            <h2>先把四个关键环节放在同一张图上</h2>
            <p>阅读只解决“内容出现过”，学习还需要让信息经过选择、组织和应用，最后进入自己的认知结构。</p>
            <div className="learning-map">
              <div><span><FileText size={21} /></span><small>输入</small><strong>原始内容</strong><p>文章的事实、观点与关系</p></div>
              <ChevronRight size={20} />
              <div className="highlight"><span><BrainCircuit size={21} /></span><small>适配</small><strong>个人 Skill</strong><p>决定怎样进入和解释</p></div>
              <ChevronRight size={20} />
              <div><span><Route size={21} /></span><small>编排</small><strong>学习配方</strong><p>顺序、媒体、互动与节奏</p></div>
              <ChevronRight size={20} />
              <div><span><Lightbulb size={21} /></span><small>形成</small><strong>个人理解</strong><p>能够复述、判断或应用</p></div>
            </div>
            <div className="insight-callout"><Lightbulb size={21} /><div><small>此处的关键</small><p>个性化并不只是换成视频或图片，而是改变知识出现的顺序、解释的方法和用户参与的位置。</p></div></div>
          </section>

          <section className="lesson-section" id="explain">
            <div className="section-number">02 · 换一种方式</div>
            <div className="section-title-row">
              <div><h2>同一个关系，也可以用另一条路进入</h2><p>你的 Skill 默认推荐图解。你仍然可以只为当前片段切换方式。</p></div>
              <div className="mode-switch" role="group" aria-label="解释模式">
                <button className={explanationMode === "map" ? "active" : ""} onClick={() => setExplanationMode("map")}><Map size={15} /> 图解模式</button>
                <button className={explanationMode === "story" ? "active" : ""} onClick={() => setExplanationMode("story")}><BookOpen size={15} /> 故事模式</button>
              </div>
            </div>
            {explanationMode === "map" ? (
              <div className="concept-layers page-enter">
                <div><span>看见</span><p>先发现文章讨论了哪些关键对象。</p></div>
                <div><span>连接</span><p>再看对象之间是因果、对比还是条件关系。</p></div>
                <div><span>转化</span><p>最后把关系带回自己的问题，形成可以使用的理解。</p></div>
              </div>
            ) : (
              <div className="narrative-block page-enter">
                <span className="quote-mark">“</span>
                <p>想象两个人拿到同一张城市地图。一个人要赶去机场，另一个人想找一间安静书店。地图没有改变，但真正有用的路线完全不同。学习也是这样：内容是同一份，路线需要根据人的目的重新生成。</p>
              </div>
            )}
          </section>

          <section className="lesson-section application-section" id="apply">
            <div className="section-number">03 · 一次应用判断</div>
            <h2>下面哪一种，才真正改变了学习路径？</h2>
            <div className="application-options">
              {["把同一份摘要换成更漂亮的配色", "根据用户目标重排内容，并改变例子和互动", "同时生成视频、音频和十张图片"].map((answer) => (
                <button key={answer} className={knowledgeAnswer === answer ? "selected" : ""} onClick={() => setKnowledgeAnswer(answer)}>
                  <span className="radio-dot">{knowledgeAnswer === answer && <Check size={14} />}</span>{answer}
                </button>
              ))}
            </div>
            {knowledgeAnswer && (
              <div className={`learning-feedback ${knowledgeAnswer.includes("重排内容") ? "correct" : "gentle"}`}>
                {knowledgeAnswer.includes("重排内容")
                  ? "是的。媒体只是手段，学习顺序、解释关系和参与方式的变化才构成真正的个性化。"
                  : "这更多改变了外观或媒体数量，还没有真正改变用户怎样建立理解。"}
              </div>
            )}
          </section>

          <section className="source-boundary">
            <div><span className="source-dot original" /><strong>原文依据</strong><p>真实版本会显示对应段落与来源位置。</p></div>
            <div><span className="source-dot ai" /><strong>AI 解释</strong><p>类比、图解与重组内容会明确标记。</p></div>
            <div><span className="source-dot extra" /><strong>外部补充</strong><p>只有经过核验并说明来源后才会加入。</p></div>
          </section>

          <footer className="lesson-finish">
            <span className="finish-icon"><CheckCircle2 size={28} /></span>
            <div><small>本次学习收束</small><h2>你已经建立了这段内容的第一层结构。</h2><p>下一步可以完成学习，或换一种方式重新理解其中某一部分。</p></div>
            <button className="button button-primary button-large" onClick={completeLearning}>
              {completed ? "本次学习已完成" : "完成本次学习"} <Check size={18} />
            </button>
          </footer>
        </article>
      </div>
    </main>
  );
}
