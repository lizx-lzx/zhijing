"use client";
import { useState } from "react";
import {
  ArrowRight,
  FileText,
  Library,
  Plus,
  ShieldCheck,
  Upload,
} from "lucide-react";
import type { Answers, Lesson, Profile, Source } from "../lib/domain";
import { mediaLabels, questions } from "../lib/domain";
import { api, ErrorNotice, Spinner } from "./learning-ui";

export function LessonCard({
  lesson,
  onOpen,
}: {
  lesson: Lesson;
  onOpen: () => void;
}) {
  const statuses: Record<string, string> = {
    queued: "排队中",
    working: "正在制作",
    ready: "已完成",
    partial: "图文可看 · 音视频待重试",
    failed: "制作未完成",
  };
  return (
    <button className="z-lesson-card" onClick={onOpen}>
      <div className={`z-card-art z-card-art-${lesson.formats[0]}`}>
        <FileText size={30} />
        <span>{lesson.formats.map((f) => mediaLabels[f]).join(" / ")}</span>
      </div>
      <div className="z-lesson-card-body">
        <span className="z-card-date">
          {new Date(lesson.createdAt).toLocaleDateString("zh-CN")} ·{" "}
          {lesson.completed ? "已学完" : statuses[lesson.status]}
        </span>
        <h3>{lesson.title}</h3>
        <span className="z-card-action">
          {["queued", "working"].includes(lesson.status)
            ? "查看制作进度"
            : "打开学习内容"}
          <ArrowRight size={17} />
        </span>
      </div>
    </button>
  );
}
export function LearningLibrary({
  lessons,
  onOpen,
  onAdd,
}: {
  lessons: Lesson[];
  onOpen: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <main className="z-container z-library">
      <div className="z-page-heading">
        <span className="z-kicker">你的内容会留在这里</span>
        <h1>学习库</h1>
        <p>重看、继续，或者换一种讲法再学一遍。</p>
      </div>
      {lessons.length ? (
        <div className="z-library-grid">
          {lessons.map((item) => (
            <LessonCard
              key={item.id}
              lesson={item}
              onOpen={() => onOpen(item.id)}
            />
          ))}
        </div>
      ) : (
        <div className="z-empty">
          <Library size={36} />
          <h2>从第一篇开始</h2>
          <p>生成的学习内容会自动保存在这里。</p>
          <button className="button button-primary" onClick={onAdd}>
            添加一篇内容
            <Plus size={16} />
          </button>
        </div>
      )}
    </main>
  );
}
export function Workbench({
  profile,
  lessons,
  onOpen,
  onGenerated,
  onProfile,
  onLibrary,
}: {
  profile: Profile;
  lessons: Lesson[];
  onOpen: (id: string) => void;
  onGenerated: (lesson: Lesson) => void;
  onProfile: () => void;
  onLibrary: () => void;
}) {
  const [mode, setMode] = useState("link"),
    [url, setUrl] = useState(""),
    [text, setText] = useState(""),
    [title, setTitle] = useState(""),
    [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  const [overrides, setOverrides] = useState<Partial<Answers>>({});
  async function generate(sample = false) {
    setError("");
    setBusy(sample ? "正在载入体验文章" : "正在读取你的内容");
    try {
      const s = sample
        ? await api<{ source: Source }>("/sources/sample", "POST", {})
        : await api<{ source: Source }>(
            "/sources",
            "POST",
            mode === "link" ? { url } : { text, title },
          );
      setBusy("正在提交学习任务");
      const d = await api<{ lesson: Lesson }>("/lessons", "POST", {
        sourceId: s.source.id,
        overrides,
      });
      onGenerated({ ...d.lesson, source: s.source });
    } catch (e) {
      setError((e as Error).message);
      if (!sample && mode === "link") setMode("text");
    } finally {
      setBusy("");
    }
  }
  return (
    <main className="z-container z-workspace">
      <div className="z-page-heading">
        <span className="z-kicker">今天想弄懂什么？</span>
        <h1>把文章交给我。</h1>
        <p>已记住你的讲法，这次不用再选。</p>
      </div>
      <div className="z-workspace-grid">
        <section className="z-composer">
          <div className="z-input-tabs" role="group" aria-label="内容输入方式">
            <button
              aria-pressed={mode === "link"}
              onClick={() => setMode("link")}
            >
              知乎链接
            </button>
            <button
              aria-pressed={mode === "text"}
              onClick={() => setMode("text")}
            >
              粘贴正文
            </button>
            <label className="z-upload">
              <Upload size={16} />
              导入文本
              <input
                type="file"
                accept=".txt,.md,text/plain,text/markdown"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 200000) {
                    setError("文件太大，请控制在 45000 字以内。");
                    return;
                  }
                  setText(await file.text());
                  setTitle(file.name.replace(/\.(txt|md)$/i, ""));
                  setMode("text");
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {mode === "link" ? (
            <label className="z-field-label">
              文章链接
              <input
                className="z-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://zhuanlan.zhihu.com/p/…"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && url.trim() && !busy) void generate();
                }}
              />
            </label>
          ) : (
            <div className="z-text-inputs">
              <input
                aria-label="文章标题（选填）"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="文章标题（选填）"
                maxLength={160}
              />
              <textarea
                aria-label="文章正文"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={45000}
                placeholder="把想理解的内容粘贴到这里。支持 100—45000 字。"
              />
              <span className="z-character-count">
                {text.length.toLocaleString()} / 45,000 字
              </span>
            </div>
          )}
          <ErrorNotice message={error} />
          <div className="z-compose-bottom">
            <span>
              <ShieldCheck size={16} />
              只在你的学习库中保存
            </span>
            <button
              className="button button-primary button-large"
              onClick={() => void generate()}
              disabled={
                !!busy ||
                (mode === "link" ? !url.trim() : text.trim().length < 100)
              }
            >
              {busy ? (
                <Spinner text={busy} />
              ) : (
                <>
                  生成我的学习内容
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
          <p className="z-disclosure">
            仅提交你有权使用的内容。原文与学习偏好将交给 AI
            服务处理；知乎限制读取时，可改为粘贴正文。
          </p>
        </section>
        <aside className="z-current-profile">
          <span>这次默认</span>
          <h2>{profile.name}</h2>
          <p>{profile.summary}</p>
          <div className="z-media-row">
            <span>{mediaLabels[profile.answers.primary]}为主</span>
            {profile.answers.extras.map((m) => (
              <span key={m}>{mediaLabels[m]}</span>
            ))}
          </div>
          <button className="z-text-link" onClick={onProfile}>
            修改长期学法 <ArrowRight size={15} />
          </button>
          <details className="z-detail z-temporary">
            <summary>只调整这一次</summary>
            <p>不改变已保存的学法。</p>
            {questions
              .filter((q) =>
                ["primary", "goal", "entry", "pace"].includes(q.id),
              )
              .map((q) => (
                <label className="z-field-label" key={q.id}>
                  {
                    (
                      {
                        primary: "主要形式",
                        goal: "这次目标",
                        entry: "讲解入口",
                        pace: "讲解节奏",
                      } as Record<string, string>
                    )[q.id]
                  }
                  <select
                    value={(overrides[q.id] ?? profile.answers[q.id]) as string}
                    onChange={(e) =>
                      setOverrides((v) => ({ ...v, [q.id]: e.target.value }))
                    }
                  >
                    {q.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
          </details>
        </aside>
      </div>
      <section className="z-sample">
        <div>
          <span className="z-kicker">还没准备好文章？</span>
          <h3>用“平均数”体验一次真正的生成。</h3>
          <p>同一篇体验文章，按照你的规则重新制作。</p>
        </div>
        <button
          className="button button-quiet"
          disabled={!!busy}
          onClick={() => void generate(true)}
        >
          为我制作这篇
          <ArrowRight size={17} />
        </button>
      </section>
      {lessons.length > 0 && (
        <section className="z-recent">
          <div className="z-section-title">
            <h2>接着上次继续</h2>
            <button className="z-text-link" onClick={onLibrary}>
              全部作品
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="z-library-grid">
            {lessons.slice(0, 3).map((item) => (
              <LessonCard
                key={item.id}
                lesson={item}
                onOpen={() => onOpen(item.id)}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
