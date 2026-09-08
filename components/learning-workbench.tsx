"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  FileText,
  Library,
  Headphones,
  MonitorPlay,
  Play,
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
  const Icon =
    {
      video: MonitorPlay,
      reading: FileText,
      audio: Headphones,
      animation: Play,
    }[lesson.formats[0]] || FileText;
  return (
    <button className="z-lesson-card" onClick={onOpen}>
      <div className={`z-card-art z-card-art-${lesson.formats[0]}`}>
        <Icon size={30} />
        <span>{lesson.formats.map((f) => mediaLabels[f]).join(" / ")}</span>
      </div>
      <div className="z-lesson-card-body">
        <span className="z-card-date">
          {new Date(lesson.createdAt).toLocaleDateString("zh-CN")}
          <span
            className={`z-status z-status-${lesson.completed ? "completed" : lesson.status}`}
          >
            {lesson.completed ? "已学完" : statuses[lesson.status]}
          </span>
        </span>
        <h3>{lesson.title}</h3>
        <span className="z-card-action">
          {["queued", "working"].includes(lesson.status)
            ? "查看制作进度"
            : lesson.studyState?.chapter !== undefined
              ? `继续第 ${lesson.studyState.chapter + 1} 章`
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
  const [query, setQuery] = useState("");
  const [items, setItems] = useState(lessons.slice(0, 24));
  const [total, setTotal] = useState(lessons.length);
  const [next, setNext] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      void api<{ lessons: Lesson[]; total: number; nextOffset: number | null }>(
        `/lessons?q=${encodeURIComponent(query)}`,
      )
        .then((data) => {
          if (!controller.signal.aborted) {
            setItems(data.lessons);
            setTotal(data.total);
            setNext(data.nextOffset);
            setError("");
          }
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError((e as Error).message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  const visibleItems = items.map((item) => {
    const fresh = lessons.find((value) => value.id === item.id);
    return fresh && (fresh.updatedAt || "") > (item.updatedAt || "")
      ? fresh
      : item;
  });
  async function more() {
    setLoading(true);
    try {
      const data = await api<{ lessons: Lesson[]; nextOffset: number | null }>(
        `/lessons?q=${encodeURIComponent(query)}&offset=${next}`,
      );
      setItems((old) => [
        ...old,
        ...data.lessons.filter((x) => !old.some((y) => y.id === x.id)),
      ]);
      setNext(data.nextOffset);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="z-container z-library">
      <div className="z-page-heading">
        <div className="z-heading-row">
          <h1>学习库</h1>
          <button className="button button-primary" onClick={onAdd}>
            <Plus size={17} />
            添加内容
          </button>
        </div>
        <p>
          {total
            ? `${total} 份学习作品 · 自动保存`
            : "生成的作品会自动留在这里。"}
        </p>
      </div>
      <label className="z-library-search">
        找一份作品
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="按标题搜索"
        />
      </label>
      <ErrorNotice message={error} />
      {items.length ? (
        <div className="z-library-grid">
          {visibleItems.map((item) => (
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
          <h2>{query ? "没有找到这份作品" : "从第一篇开始"}</h2>
          <p>
            {query
              ? "试试其他关键词，或清空搜索。"
              : "生成的学习内容会自动保存在这里。"}
          </p>
          <button className="button button-primary" onClick={onAdd}>
            添加一篇内容
            <Plus size={16} />
          </button>
        </div>
      )}
      {loading && <Spinner text="正在读取学习库" />}
      {next !== null && (
        <button
          className="button button-quiet z-load-more"
          disabled={loading}
          onClick={() => void more()}
        >
          加载更多
        </button>
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
  const [fullPackage, setFullPackage] = useState(false);
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
        ...(fullPackage
          ? {
              formats: [
                ...new Set([
                  overrides.primary || profile.answers.primary,
                  "reading",
                  "video",
                  "audio",
                  "animation",
                ]),
              ],
            }
          : {}),
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
        <span className="z-kicker">开始学习</span>
        <h1>今天想读懂什么？</h1>
        <p>放入一篇文章，按你的学法整理。</p>
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
          <div className="z-composer-recipe">
            <span>
              本次以{" "}
              <strong>
                {mediaLabels[overrides.primary || profile.answers.primary]}
              </strong>{" "}
              为主
            </span>
            <button
              className="z-text-link"
              type="button"
              onClick={() => {
                const panel = document.getElementById(
                  "temporary-learning-settings",
                ) as HTMLDetailsElement | null;
                if (panel) {
                  panel.open = true;
                  panel.scrollIntoView({
                    block: "center",
                    behavior: "instant",
                  });
                }
              }}
            >
              临时调整
            </button>
          </div>
          <ErrorNotice message={error} />
          <label className="z-full-package">
            <input
              type="checkbox"
              checked={fullPackage}
              onChange={(e) => setFullPackage(e.target.checked)}
            />
            <span>
              这次同时生成全部形式
              <small>
                视频、独立音频一起制作；图文、图解、全文关系和复习卡默认包含。
              </small>
            </span>
          </label>
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
                  开始生成
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
          <h2>我的学习配方</h2>
          <p>
            {
              questions
                .find((q) => q.id === "entry")
                ?.options.find(
                  (o) => o.value === (overrides.entry || profile.answers.entry),
                )?.label
            }{" "}
            ·{" "}
            {
              questions
                .find((q) => q.id === "pace")
                ?.options.find(
                  (o) => o.value === (overrides.pace || profile.answers.pace),
                )?.label
            }
          </p>
          <div className="z-media-row">
            <span>
              {mediaLabels[overrides.primary || profile.answers.primary]}为主
            </span>
            {profile.answers.extras.map((m) => (
              <span key={m}>{mediaLabels[m]}</span>
            ))}
          </div>
          <button className="z-text-link" onClick={onProfile}>
            修改长期学法 <ArrowRight size={15} />
          </button>
          <details
            className="z-detail z-temporary"
            id="temporary-learning-settings"
          >
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
          <h3>手边没有文章？</h3>
          <p>用一篇“平均数”短文试试你的学法。</p>
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
