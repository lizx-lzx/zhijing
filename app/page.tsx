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
import ParallaxPills, {
  type ParallaxPillItem,
} from "@/components/react-bits/parallax-pills";
import StaggeredText from "@/components/react-bits/staggered-text";

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
  "https://zhuanlan.zhihu.com/p/2009319586063992724";

const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const videoSampleUrl = `${publicBasePath}/demo/web-animation-sample.mp4`;
const videoSamplePoster = `${publicBasePath}/demo/web-animation-sample.jpg`;
const videoSampleCaptions = `${publicBasePath}/demo/web-animation-sample.vtt`;

const heroLearningPills: ParallaxPillItem[] = [
  {
    label: "问题进入",
    background: "#fff3dc",
    color: "#895b18",
    x: 19,
    y: 12,
    width: 25,
    rotate: -3,
    parallax: 0.65,
  },
  {
    label: "全局地图",
    background: "#e7ebff",
    color: "#3f50bc",
    x: 73,
    y: 11,
    width: 25,
    rotate: 2,
    parallax: 0.85,
  },
  {
    label: "关系图解",
    background: "#ffffff",
    color: "#1d1f24",
    x: 9,
    y: 52,
    width: 23,
    rotate: -2,
    parallax: 1.1,
  },
  {
    label: "主动回忆",
    background: "#e7f3ed",
    color: "#356b53",
    x: 28,
    y: 89,
    width: 26,
    rotate: 2,
    parallax: 0.75,
  },
  {
    label: "应用推演",
    background: "#4f63d8",
    color: "#ffffff",
    x: 79,
    y: 88,
    width: 27,
    rotate: -2,
    parallax: 1,
  },
];

const heroBackgroundPills = [
  { background: "#edf0ff", x: 2, y: 20, width: 18, rotate: -3 },
  { background: "#f8e9cf", x: 96, y: 29, width: 20, rotate: 4 },
  { background: "#e6f0ea", x: 96, y: 70, width: 18, rotate: -2 },
];

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="知径个性化学习平台">
      <span className="brand-mark">径</span>
      {!compact && (
        <span className="brand-copy">
          <strong>知径</strong>
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
  const isCaseArticle = articleUrl.includes("2009319586063992724");

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

  function openArticleCase() {
    setArticleUrl(sampleUrl);
    setSourceReady(true);
    setView("learning");
    window.scrollTo({ top: 0, behavior: "smooth" });
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
          {hasProfile && (
            <button className="button button-quiet" onClick={() => setView("workspace")}>
              进入我的工作台 <ArrowRight size={16} />
            </button>
          )}
        </nav>

        <section className="hero container">
          <div className="hero-copy">
            <Pill>
              <Sparkles size={14} /> 一次问卷，以后自动适配
            </Pill>
            <h1>
              贴一篇文章，
              <br />
              得到你的<span>学习版本。</span>
            </h1>
            <StaggeredText
              as="p"
              text="第一次来，用几分钟形成个人学习 Skill。以后输入内容，平台会自动生成视频讲解、互动网页、图解与文字重点。"
              segmentBy="lines"
              delay={28}
              duration={0.5}
              direction="bottom"
              blur={false}
              respectReducedMotion
            />
            <div className="hero-actions">
              <button className="button button-primary button-large" onClick={beginProfile}>
                开始了解我的学习方式 <ArrowRight size={18} />
              </button>
              <button className="button button-quiet button-large" onClick={openArticleCase}>
                看一个完整案例 <Play size={17} />
              </button>
            </div>
          </div>

          <div className="hero-visual" aria-label="个性化学习方式预览">
            <div className="orb orb-one" />
            <div className="orb orb-two" />
            <ParallaxPills
              className="hero-learning-pills"
              pills={heroLearningPills}
              backgroundPills={heroBackgroundPills}
              height="100%"
              pillHeight={40}
              pillRadius={13}
              fontSize={12}
              fontWeight={700}
              parallaxStrength={11}
              entryStagger={0.06}
              entryDamping={17}
              entryDistance={115}
              hingeChance={0}
              disableEmptyPills={false}
            />
            <div className="profile-card main-profile-card">
              <div className="card-kicker">
                <BrainCircuit size={17} /> 你的学习方式初稿
              </div>
              <h3>整体地图先行，情境帮助进入</h3>
              <div className="trait-list">
                <div><Map size={16} /><span>全局结构</span></div>
                <div><Layers3 size={16} /><span>图文配合</span></div>
                <div><MessageCircle size={16} /><span>轻量互动</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="how-it-works container">
          <div className="section-heading">
            <StaggeredText
              as="h2"
              text="平台只替你做三件事"
              segmentBy="chars"
              delay={36}
              duration={0.48}
              direction="bottom"
              respectReducedMotion
            />
          </div>
          <div className="steps-grid">
            <article>
              <span>01</span><BrainCircuit size={22} />
              <h3>记住你怎样学</h3>
              <p>问卷只做一次，形成你的个人学习 Skill。</p>
            </article>
            <article>
              <span>02</span><Link2 size={22} />
              <h3>理解你给的内容</h3>
              <p>先从知乎文章开始，拆出观点、关系与来源边界。</p>
            </article>
            <article>
              <span>03</span><WandSparkles size={22} />
              <h3>交付一套学习作品</h3>
              <p>视频、互动网页、图解和文字一起生成，不再让你自己整理。</p>
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
                  <span><strong>{option.label}</strong></span>
                </button>
              );
            })}
          </div>
          <div className="question-footer">
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
                    <h3>{isCaseArticle ? "窗口期可能只剩五年" : "你提供的知乎文章"}</h3>
                    <p>{isCaseArticle ? "本次案例已根据原文拆出观点、因果链、预测与行动建议。" : "自动抓取尚未接入；当前可以先查看已经完成的案例文章。"}</p>
                    <div><span>{isCaseArticle ? "20+ 个章节" : "等待内容接口"}</span><span>{isCaseArticle ? "AI 经济情景推演" : "知乎公开文章"}</span></div>
                  </div>
                  <CheckCircle2 className="source-check" size={22} />
                </article>

                <section className="recipe-panel">
                  <div className="recipe-heading">
                    <div><span>一次性交付</span><h2>{isCaseArticle ? "个人 Skill 已经替你完成编排" : "先查看已经完成的文章案例"}</h2></div>
                    <span className="recommend-label"><Sparkles size={14} /> 已调用个人 Skill</span>
                  </div>
                  <div className="recommended-recipe">
                    <span className="recipe-orb"><Route size={22} /></span>
                    <div><small>{isCaseArticle ? "为你生成的学习成品" : "当前可查看的演示"}</small><h3>情境进入＋因果链图解＋来源边界＋应用清单</h3><p>约 5 分钟，直接获得完整结果，不再追加提问。</p></div>
                    <button className="button button-primary button-large" onClick={isCaseArticle ? startLearning : openArticleCase} disabled={isGenerating}>
                      {isGenerating ? "正在生成学习成品…" : isCaseArticle ? "查看完整结果" : "载入案例文章"}
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
                    <div><small>最近学习</small><h3>窗口期可能只剩五年｜个性化学习版本</h3><p>情境＋因果图 · 已完成</p></div>
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
          <span><Clock3 size={15} /> 约 5 分钟</span>
          <button className="button button-quiet" onClick={() => setView("workspace")}><ArrowLeft size={16} /> 返回工作台</button>
        </div>
      </header>

      <div className="learning-layout container-learning">
        <aside className="lesson-nav">
          <span className="lesson-label">学习路径</span>
          <nav>
            <a className="active" href="#question"><span>01</span>先看文章问题</a>
            <a href="#video"><span>02</span>视频讲解形式</a>
            <a href="#map"><span>03</span>看懂核心循环</a>
            <a href="#impact"><span>04</span>拆开三层冲击</a>
            <a href="#boundary"><span>05</span>分清事实与推演</a>
            <a href="#apply"><span>06</span>带回自己的问题</a>
          </nav>
          <div className="lesson-progress"><span>案例成品</span><strong>{completed ? "已完成" : "可直接学习"}</strong><div><i style={{ width: completed ? "100%" : "72%" }} /></div></div>
        </aside>

        <article className="lesson-content">
          <div className="case-source-notice">
            <ShieldCheck size={17} />
            <span><strong>真实文章案例：</strong>内容根据知乎原文拆解；作者的现实材料、因果推断、未来预测和行动建议将分别标记。本案例未逐项核验文中所有数字。</span>
          </div>

          <header className="lesson-hero" id="question">
            <div className="lesson-meta"><span>案例学习成品</span><span>学会应用</span><span>情境＋图解</span><span>不强制提问</span></div>
            <h1>AI 越成功，经济反而可能越危险？</h1>
            <p>文章担心的不是 AI 失败，而是它成功得太快：企业效率迅速提高，但就业、购买力和制度调整可能跟不上。</p>
            <a className="source-link" href={sampleUrl} target="_blank" rel="noreferrer"><Link2 size={15} /> 查看知乎原文</a>
            <div className="skill-route-strip">
              <span><BrainCircuit size={17} /> 本次个人 Skill</span>
              <strong>故事进入</strong><strong>视频式节奏</strong><strong>直接讲清</strong><strong>应用收束</strong>
            </div>
          </header>

          <section className="lesson-section video-learning-section" id="video">
            <div className="section-number">02 · 视频讲解</div>
            <div className="video-section-heading">
              <div>
                <h2>网页动画可以直接成为学习视频</h2>
                <p>下面是“一键网页动画”已经产出的真实知识视频，用来展示这个平台会调用的画面、配音与节奏能力。</p>
              </div>
              <span>能力样片 · 非本篇成片</span>
            </div>
            <div className="embedded-video-card">
              <video controls preload="metadata" poster={videoSamplePoster} playsInline>
                <source src={videoSampleUrl} type="video/mp4" />
                <track kind="captions" src={videoSampleCaptions} srcLang="zh-CN" label="中文字幕" default />
                你的浏览器暂时无法播放这个视频。
              </video>
              <div className="video-caption">
                <div><Play size={18} /><span><strong>真实生成结果</strong><small>网页动画源经过配音、字幕、声音与渲染后导出</small></span></div>
                <p>正式接线后，这里将换成当前文章按照你的个人学习 Skill 生成的视频，而不是固定样片。</p>
              </div>
            </div>
            <div className="video-output-flow" aria-label="个性化视频生成流程">
              <div><span>1</span><strong>学习 Skill 定讲法</strong></div>
              <ChevronRight size={16} />
              <div><span>2</span><strong>网页动画定画面</strong></div>
              <ChevronRight size={16} />
              <div><span>3</span><strong>流水线生成视频</strong></div>
            </div>
          </section>

          <section className="lesson-section story-entry">
            <div className="section-number">补充 · 情境进入</div>
            <h2>一家公司做对了每个决定，为什么最后可能让所有人更难？</h2>
            <div className="story-case">
              <div className="story-case-copy">
                <span className="story-label">想象 2027 年的一次预算会议</span>
                <p>公司发现，几名员工借助 AI，几个星期就能完成过去需要购买昂贵 SaaS、再配一支团队才能完成的工作。</p>
                <p>于是它取消软件订阅、减少岗位，用 AI 保持产出。对这家公司来说，每一步都合理。</p>
              </div>
              <div className="story-decisions">
                <div><small>决定一</small><strong>砍掉软件合同</strong><span>降低采购成本</span></div>
                <div><small>决定二</small><strong>减少部分岗位</strong><span>保持利润空间</span></div>
                <div className="story-result"><small>所有公司一起做</small><strong>局部理性变成整体压力</strong><span>收入、消费与企业营收同时收缩</span></div>
              </div>
            </div>
            <div className="insight-callout"><Lightbulb size={21} /><div><small>先抓住文章真正的问题</small><p>作者讨论的不是“AI 会不会成功”，而是技术成功后，社会能不能及时接住被改变的就业、收入和责任结构。</p></div></div>
          </section>

          <section className="lesson-section" id="map">
            <div className="section-number">03 · 核心反馈循环</div>
            <h2>整篇长文，其实围绕这一圈在转</h2>
            <p>每一个环节单独看都可能成立，真正需要判断的是：这些环节会不会以作者设想的速度连接起来。</p>
            <div className="causal-loop-grid">
              <div><span>01</span><strong>AI 能力提高</strong><p>认知工作的边际成本下降</p></div>
              <div><span>02</span><strong>企业降本</strong><p>减少软件采购与部分人力</p></div>
              <div><span>03</span><strong>岗位和收入减少</strong><p>白领消费能力开始下降</p></div>
              <div><span>04</span><strong>企业营收承压</strong><p>需求收缩传回产业端</p></div>
              <div><span>05</span><strong>信贷与资产承压</strong><p>房贷、科技信贷出现风险</p></div>
              <div className="loop-return"><span>06</span><strong>继续投入 AI</strong><p>为了利润再次提高自动化</p></div>
            </div>
            <div className="loop-thesis"><span>关键概念</span><strong>合成谬误</strong><p>每个参与者分别做出的合理选择，叠加后可能产生一个对整体不利的结果。</p></div>
          </section>

          <section className="lesson-section" id="impact">
            <div className="section-number">04 · 三层冲击</div>
            <h2>作者把同一个技术变化推向了三个不同系统</h2>
            <div className="impact-grid">
              <article><span><FileText size={20} /></span><small>产业</small><h3>SaaS 与中间商</h3><p>内部开发变便宜，Agent 又降低比较和交易成本，原先依赖信息差、流程和入口的商业模式受到挤压。</p></article>
              <article><span><BrainCircuit size={20} /></span><small>家庭</small><h3>白领、消费与房贷</h3><p>如果高收入认知岗位先受冲击，消费下降会被储蓄和借贷暂时掩盖，随后才传导到住房与企业收入。</p></article>
              <article><span><ShieldCheck size={20} /></span><small>社会</small><h3>智能溢价与人的价值</h3><p>当一般认知能力不再稀缺，人类的相对价值可能转向责任、信任、真实关系和必须进入现场的能力。</p></article>
            </div>
          </section>

          <section className="lesson-section" id="boundary">
            <div className="section-number">05 · 来源边界</div>
            <h2>不能把一篇有感染力的推演，误读成已经发生的未来</h2>
            <div className="claim-grid">
              <article className="claim-fact"><span>原文陈述</span><h3>作者引用的现实材料</h3><p>模型发布、就业影响估算、劳动力份额和私人信贷规模等。案例保留原文身份，但没有逐项完成外部事实核验。</p></article>
              <article className="claim-inference"><span>作者推断</span><h3>可能出现的作用机制</h3><p>AI 压缩 SaaS、中间商和部分白领岗位；劳动收入下降进一步削弱需求。</p></article>
              <article className="claim-forecast"><span>情景预测</span><h3>2030 年压力情景</h3><p>两位数失业率、信贷链断裂、科技城市房价下跌以及具体年份，都不是已经确定的事实。</p></article>
              <article className="claim-advice"><span>作者建议</span><h3>行动和投资判断</h3><p>使用 AI、积累资产、现金缓冲以及关于指数和 BTC 的表达，属于作者立场，不是平台的个性化投资建议。</p></article>
            </div>
          </section>

          <section className="lesson-section application-section" id="apply">
            <div className="section-number">06 · 带回自己</div>
            <h2>不需要先相信“五年”，也可以立刻检查四件事</h2>
            <div className="application-cards">
              <article><span>01</span><h3>拆开自己的工作价值</h3><p>分清信息处理、现实操作、责任承担、信任关系和资源所有权各占多少。</p></article>
              <article><span>02</span><h3>完成一个 AI 工作流</h3><p>不是多聊几次，而是让真实任务经过输入、AI 处理、人工判断，最终形成可交付结果。</p></article>
              <article><span>03</span><h3>减少单点脆弱性</h3><p>不要让收入只依赖一个岗位、一种技能或一个客户；现金、作品和关系都属于缓冲。</p></article>
              <article><span>04</span><h3>建立必须由人承担的价值</h3><p>持续积累责任、信誉、现场判断和长期关系，而不只是在速度上与机器竞争。</p></article>
            </div>
            <div className="closing-card"><small>真正值得带走的判断</small><p>这篇文章的价值不在于精确预言哪一年会发生危机，而在于提醒我们观察：技术效率、劳动收入与制度适应之间，是否正在出现速度差。</p></div>
          </section>

          <footer className="lesson-finish">
            <span className="finish-icon"><CheckCircle2 size={28} /></span>
            <div><small>本次学习收束</small><h2>你已经看懂文章的核心机制，也知道哪些只是作者推演。</h2><p>完整结果已经一次性交付，不需要继续回答问题。</p></div>
            <button className="button button-primary button-large" onClick={completeLearning}>
              {completed ? "本次学习已完成" : "完成本次学习"} <Check size={18} />
            </button>
          </footer>
        </article>
      </div>
    </main>
  );
}
