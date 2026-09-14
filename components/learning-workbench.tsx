"use client";
/* Private posters require the visitor cookie; do not route through an image proxy. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  FileText,
  Library,
  Headphones,
  MonitorPlay,
  Play,
  Plus,
  Upload,
} from "lucide-react";
import type { Answers, Lesson, Profile, Source } from "../lib/domain";
import { mediaLabels, profileForLesson, questions } from "../lib/domain";
import { api, base, endpoint, ErrorNotice, Spinner } from "./learning-ui";
import { ArticleCasePreview } from "./learning-case-preview";

export function LessonCard({
  lesson,
  onOpen,
}: {
  lesson: Lesson;
  onOpen: () => void;
}) {
  const [posterFailed, setPosterFailed] = useState(false);
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
        <img
          src={
            lesson.media.videoReady && !posterFailed
              ? endpoint(`/lessons/${lesson.id}/media/poster.jpg`)
              : `${base}/images/learning-paths-v1.webp`
          }
          alt=""
          loading="lazy"
          width={640}
          height={360}
          onError={() => setPosterFailed(true)}
        />
        <Icon size={24} className="z-card-medium-icon" />
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
          <h1>知藏</h1>
          <button className="button button-primary" onClick={onAdd}>
            <Plus size={17} />
            添加内容
          </button>
        </div>
        {total > 0 && <p>{total} 份作品</p>}
      </div>
      <label className="z-library-search">
        <span className="sr-only">按标题搜索作品</span>
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
      {loading && <Spinner text="正在读取知藏" />}
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
  const currentAnswers = profileForLesson(profile, overrides).answers;
  async function generate() {
    setError("");
    setBusy("正在读取你的内容");
    try {
      const s = await api<{ source: Source }>(
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
      if (mode === "link") setMode("text");
    } finally {
      setBusy("");
    }
  }
  return (
    <main className="z-container z-workspace">
      <div className="z-page-heading">
        <h1>待启集</h1>
        <p>把想读懂的，放在这里。</p>
      </div>
      <section className="z-composer">
        <div className="z-input-tabs" role="group" aria-label="内容输入方式">
          <button
            aria-pressed={mode === "link"}
            onClick={() => setMode("link")}
          >
            放入链接
          </button>
          <button
            aria-pressed={mode === "text"}
            onClick={() => setMode("text")}
          >
            放入正文
          </button>
          <label className="z-upload">
            <Upload size={16} />
            放入文件
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
        <details className="z-detail z-temporary">
          <summary>
            <span>
              这次读法：<strong>{mediaLabels[currentAnswers.primary]}</strong>
              {currentAnswers.extras.length > 0 &&
                ` + ${currentAnswers.extras.map((m) => mediaLabels[m]).join("、")}`}
            </span>
            <span className="z-settings-toggle">
              调整 <ChevronDown size={16} aria-hidden="true" />
            </span>
          </summary>
          <p>仅这次生效</p>
          <div className="z-temporary-fields">
            {questions
              .filter((q) =>
                ["primary", "goal", "entry", "pace"].includes(q.id),
              )
              .map((q) => (
                <label className="z-field-label" key={q.id}>
                  {
                    {
                      primary: "主要形式",
                      goal: "这次目标",
                      entry: "讲解入口",
                      pace: "讲解节奏",
                    }[q.id as "primary" | "goal" | "entry" | "pace"]
                  }
                  <select
                    value={currentAnswers[q.id] as string}
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
          </div>
          <button className="z-text-link" onClick={onProfile}>
            修改读法笺 <ArrowRight size={15} />
          </button>
        </details>
        <ErrorNotice message={error} />
        <label className="z-full-package">
          <input
            type="checkbox"
            checked={fullPackage}
            onChange={(e) => setFullPackage(e.target.checked)}
          />
          <span>生成全部形式</span>
        </label>
        <div className="z-compose-bottom">
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
                帮我读懂它
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
        <p className="z-disclosure">
          仅提交你有权使用的内容；原文与学习偏好将由 AI 服务处理。
        </p>
      </section>
      <section className="z-recent">
        <div className="z-section-title">
          <h2>上回读到</h2>
          <button className="z-text-link" onClick={onLibrary}>
            打开知藏
            <ArrowRight size={16} />
          </button>
        </div>
        <ArticleCasePreview medium="video" />
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
    </main>
  );
}
