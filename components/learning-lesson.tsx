"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Download,
  FileText,
  Headphones,
  MonitorPlay,
  Play,
  List,
} from "lucide-react";
import type { Lesson, Medium } from "../lib/domain";
import { mediaLabels } from "../lib/domain";
import {
  api,
  endpoint,
  ErrorNotice,
  Modal,
  Spinner,
  Visual,
} from "./learning-ui";
const icons = {
  video: MonitorPlay,
  reading: FileText,
  audio: Headphones,
  animation: Play,
};

export function LessonView({
  initial,
  onBack,
  onUpdate,
  notify,
}: {
  initial: Lesson;
  onBack: () => void;
  onUpdate: () => void;
  notify: (message: string) => void;
}) {
  const [lesson, setLesson] = useState(initial),
    [medium, setMedium] = useState<Medium>(initial.formats[0] || "reading"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false),
    [focus, setFocus] = useState<string[]>([]),
    [quiz, setQuiz] = useState<Record<number, number>>({}),
    [feedback, setFeedback] = useState<boolean | null>(null);
  const [chapterOpen, setChapterOpen] = useState(false),
    [activeChapter, setActiveChapter] = useState(0),
    [transcriptOpen, setTranscriptOpen] = useState(false),
    [connectionError, setConnectionError] = useState("");
  const video = useRef<HTMLVideoElement>(null),
    audio = useRef<HTMLAudioElement>(null),
    playbackTime = useRef(0);
  const pending = ["queued", "working"].includes(lesson.status);
  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const d = await api<{ lesson: Lesson }>(`/lessons/${initial.id}`);
        if (active) {
          setConnectionError("");
          setLesson(d.lesson);
          if (!["queued", "working"].includes(d.lesson.status)) onUpdate();
        }
      } catch {
        if (active && pending)
          setConnectionError("连接暂时中断，正在重连。任务已保存。");
      }
    }
    void poll();
    if (!pending)
      return () => {
        active = false;
      };
    const t = setInterval(() => void poll(), 2500);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [initial.id, pending]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (medium !== "reading") return;
    let frame = 0;
    const update = () => {
      if (frame || document.querySelector("dialog[open]")) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const threshold =
          (document.querySelector(".z-lesson-toolbar")?.getBoundingClientRect()
            .bottom || 0) + 32;
        let current = 0;
        document.querySelectorAll(".z-chapter").forEach((el, i) => {
          if (el.getBoundingClientRect().top <= threshold) current = i;
        });
        setActiveChapter(current);
      });
    };
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      cancelAnimationFrame(frame);
    };
  }, [medium]);
  function selectChapter(index: number) {
    setActiveChapter(index);
    setChapterOpen(false);
    const at = lesson.media.scenes?.[index]?.start;
    if (
      (medium === "video" || medium === "audio") &&
      at !== undefined &&
      lesson.media.status === "ready"
    ) {
      playbackTime.current = at;
      const player = medium === "video" ? video.current : audio.current;
      if (player) player.currentTime = at;
    } else setMedium("reading");
    requestAnimationFrame(() => {
      const target =
        (medium === "video" || medium === "audio") &&
        at !== undefined &&
        lesson.media.status === "ready"
          ? document.querySelector(".z-media-surface, .z-audio-surface")
          : document.getElementById(
              `chapter-${lesson.result?.chapters[index]?.id}`,
            );
      if (target)
        window.scrollTo({
          top: Math.max(
            0,
            window.scrollY +
              target.getBoundingClientRect().top -
              (document.querySelector(".z-lesson-toolbar")?.clientHeight || 0) -
              20,
          ),
          behavior: "instant",
        });
    });
  }
  function trackMedia(time: number) {
    playbackTime.current = time;
    const index = lesson.media.scenes?.findIndex(
      (s) => time >= s.start && time < s.end,
    );
    if (index !== undefined && index >= 0) setActiveChapter(index);
  }
  function switchMedium(next: Medium) {
    video.current?.pause();
    audio.current?.pause();
    if (medium === "reading") {
      playbackTime.current = lesson.media.scenes?.[activeChapter]?.start || 0;
    }
    setMedium(next);
    requestAnimationFrame(() => {
      const target =
        next === "reading"
          ? document.getElementById(
              `chapter-${lesson.result?.chapters[activeChapter]?.id}`,
            )
          : document.querySelector(".z-learning-main");
      if (target && window.scrollY > 180)
        window.scrollTo({
          top: Math.max(
            0,
            window.scrollY +
              target.getBoundingClientRect().top -
              (document.querySelector(".z-lesson-toolbar")?.clientHeight || 0) -
              20,
          ),
          behavior: "instant",
        });
    });
  }
  async function retry() {
    setBusy(true);
    setError("");
    try {
      await api(`/lessons/${lesson.id}/retry`, "POST", {});
      const d = await api<{ lesson: Lesson }>(`/lessons/${lesson.id}`);
      setLesson(d.lesson);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function record(helpful: boolean | null, completed: boolean) {
    try {
      await api(`/lessons/${lesson.id}/feedback`, "POST", {
        helpful,
        completed,
      });
      setLesson({ ...lesson, completed });
      setFeedback(helpful);
      notify(
        completed
          ? "已记录。下次从学习库继续。"
          : "谢谢反馈，不会自动改动你的学习方式。",
      );
      onUpdate();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function showSource(ids: string[] = []) {
    setFocus(ids);
    setSourceOpen(true);
  }
  const result = lesson.result;
  return (
    <main className="z-lesson">
      <header className="z-lesson-header z-container">
        <button className="z-text-link" onClick={onBack}>
          <ArrowLeft size={16} />
          返回学习库
        </button>
        <div className="z-lesson-title">
          <span className="z-kicker">
            {lesson.source?.mode === "sample"
              ? "知径体验文章 · 虚构示例"
              : "你的学习作品"}
          </span>
          <h1>{result?.title || lesson.title}</h1>
          {result?.lead && <p>{result.lead}</p>}
        </div>
      </header>
      {result && (
        <div className="z-lesson-toolbar z-container">
          <div className="z-medium-tabs" role="group" aria-label="学习形式">
            {(["video", "animation", "reading", "audio"] as Medium[])
              .filter(
                (m) =>
                  m === "reading" ||
                  m === "animation" ||
                  lesson.formats.includes(m),
              )
              .map((m) => {
                const Icon = icons[m];
                return (
                  <button
                    aria-pressed={medium === m}
                    key={m}
                    onClick={() => switchMedium(m)}
                  >
                    <Icon size={17} />
                    {mediaLabels[m]}
                  </button>
                );
              })}
          </div>
          <button
            className="z-mobile-directory"
            type="button"
            onClick={() => setChapterOpen(true)}
            aria-label="打开章节目录"
          >
            <List size={18} />
            目录
          </button>
          {result && (
            <details className="z-export">
              <summary>
                <Download size={16} />
                导出
                <ChevronDown size={15} />
              </summary>
              <div>
                <a href={endpoint(`/lessons/${lesson.id}/export.html`)}>
                  离线学习网页
                </a>
                <a href={endpoint(`/lessons/${lesson.id}/export.json`)}>
                  完整内容与来源
                </a>
                {lesson.media.status === "ready" && (
                  <>
                    <a
                      href={endpoint(
                        `/lessons/${lesson.id}/media/audio.m4a?download`,
                      )}
                    >
                      配音文件
                    </a>
                    {lesson.formats.includes("video") && (
                      <a
                        href={endpoint(
                          `/lessons/${lesson.id}/media/video.mp4?download`,
                        )}
                      >
                        MP4 视频
                      </a>
                    )}
                  </>
                )}
              </div>
            </details>
          )}
        </div>
      )}
      <div className="z-container">
        <ErrorNotice message={error} />
        {pending && (
          <section className="z-job-progress" role="status">
            <span className="z-kicker">正在为你制作</span>
            <h2>
              {result ? "图文已就绪，其他形式正在准备" : "把文章整理成你的讲法"}
            </h2>
            <div>
              <Spinner text={lesson.stage} />
              <span>{lesson.progress}%</span>
            </div>
            <div className="z-progress">
              <span style={{ width: `${lesson.progress}%` }} />
            </div>
            <p>
              可以离开页面，制作会继续。
              {result
                ? "图文已经就绪，可以先看。"
                : "完成后会出现在你的学习库。"}
            </p>
            {connectionError && (
              <p className="z-connection-error">{connectionError}</p>
            )}
            <button className="button button-quiet" onClick={onBack}>
              先回学习库
            </button>
          </section>
        )}
        {lesson.status === "failed" && (
          <div className="z-error" role="alert">
            <strong>这次没有制作完成</strong>
            <p>{lesson.error}</p>
            <button
              className="button button-primary"
              disabled={busy}
              onClick={() => void retry()}
            >
              重试制作
            </button>
          </div>
        )}
        {lesson.status === "partial" && (
          <div className="z-error" role="alert">
            <p>{lesson.media.error}</p>
            <button
              className="button button-quiet"
              disabled={busy}
              onClick={() => void retry()}
            >
              重试音视频
            </button>
            <button
              className="button button-quiet"
              onClick={() => setMedium("reading")}
            >
              先看完整图文
            </button>
          </div>
        )}
      </div>
      {result && (
        <div className="z-container z-learning-layout">
          <aside className="z-chapter-nav">
            <span>章节目录 · {result.chapters.length}</span>
            {result.chapters.map((chapter, i) => (
              <button
                type="button"
                key={chapter.id}
                className={activeChapter === i ? "active" : ""}
                aria-current={activeChapter === i ? "step" : undefined}
                onClick={() => selectChapter(i)}
              >
                <small>{String(i + 1).padStart(2, "0")}</small>
                {chapter.title}
              </button>
            ))}
            <button className="z-text-link" onClick={() => showSource()}>
              查看原文与来源
            </button>
          </aside>
          <div className="z-learning-main">
            {medium === "video" &&
              (lesson.media.status === "ready" ? (
                <section className="z-media-surface">
                  <video
                    ref={video}
                    key={lesson.id}
                    controls
                    playsInline
                    preload="metadata"
                    poster={endpoint(`/lessons/${lesson.id}/media/poster.jpg`)}
                    aria-label={result.title}
                    onTimeUpdate={(e) =>
                      trackMedia(e.currentTarget.currentTime)
                    }
                    onLoadedMetadata={(e) => {
                      e.currentTarget.currentTime = Math.min(
                        playbackTime.current,
                        e.currentTarget.duration || 0,
                      );
                    }}
                  >
                    <source
                      src={endpoint(`/lessons/${lesson.id}/media/video.mp4`)}
                      type="video/mp4"
                    />
                    <track
                      kind="captions"
                      src={endpoint(`/lessons/${lesson.id}/media/captions.vtt`)}
                      srcLang="zh-CN"
                      label="章节内近似时间字幕"
                    />
                  </video>
                  <p>当前文章的 AI 配音视频 · 可切换图文查看完整解释和来源</p>
                </section>
              ) : (
                <div className="z-media-wait">
                  <MonitorPlay size={36} />
                  <h2>{pending ? "视频正在制作" : "视频尚未准备好"}</h2>
                  <p>图文已经准备好，可以先读。</p>
                  <button
                    className="button button-quiet"
                    onClick={() => switchMedium("reading")}
                  >
                    切到图文先看
                  </button>
                </div>
              ))}
            {medium === "audio" &&
              (lesson.media.status === "ready" ? (
                <section className="z-audio-surface">
                  <Headphones size={36} />
                  <h2>用耳朵听懂这一篇</h2>
                  <audio
                    ref={audio}
                    controls
                    preload="metadata"
                    src={endpoint(`/lessons/${lesson.id}/media/audio.m4a`)}
                    onTimeUpdate={(e) =>
                      trackMedia(e.currentTarget.currentTime)
                    }
                    onLoadedMetadata={(e) => {
                      e.currentTarget.currentTime = Math.min(
                        playbackTime.current,
                        e.currentTarget.duration || 0,
                      );
                    }}
                  >
                    <track
                      kind="captions"
                      src={endpoint(`/lessons/${lesson.id}/media/captions.vtt`)}
                      srcLang="zh-CN"
                      label="讲解字幕"
                    />
                  </audio>
                  <p>AI 生成配音，按本篇章节顺序讲解。</p>
                </section>
              ) : (
                <div className="z-media-wait">
                  <Headphones size={32} />
                  <h2>{pending ? "配音正在制作" : "配音尚未准备好"}</h2>
                  <p>图文已经准备好，可以先读。</p>
                  <button
                    className="button button-quiet"
                    onClick={() => switchMedium("reading")}
                  >
                    切到图文先看
                  </button>
                </div>
              ))}
            {medium === "animation" && (
              <section className="z-animation-surface">
                <iframe
                  key={`${lesson.id}-${lesson.media.status}`}
                  src={endpoint(`/lessons/${lesson.id}/player`)}
                  title="个性化网页讲解"
                  sandbox="allow-scripts allow-same-origin allow-downloads"
                />
                <p>每章可暂停、可切换。配音未完成时先显示无声讲解。</p>
              </section>
            )}
            <details className="z-detail z-adaptation">
              <summary>这篇是怎样按我的习惯讲的？</summary>
              <ul>
                {result.adaptation.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </details>
            {medium !== "reading" && (
              <button
                type="button"
                className="z-reading-toggle"
                aria-expanded={transcriptOpen}
                onClick={() => setTranscriptOpen((v) => !v)}
              >
                <FileText size={18} />
                {transcriptOpen ? "收起配套图文" : "展开配套图文与来源"}
                <ChevronDown size={16} />
              </button>
            )}
            <div
              hidden={medium !== "reading" && !transcriptOpen}
              className={medium === "reading" ? "z-reading" : "z-transcript"}
            >
              <div className="z-section-title">
                <h2>{medium === "reading" ? "完整图文" : "配套图文与来源"}</h2>
                <button className="z-text-link" onClick={() => showSource()}>
                  原文
                </button>
              </div>
              {result.chapters.map((chapter, index) => (
                <section
                  className="z-chapter"
                  id={`chapter-${chapter.id}`}
                  key={chapter.id}
                >
                  <div className="z-chapter-number">
                    {String(index + 1).padStart(2, "0")}{" "}
                    <span>
                      {chapter.kind}
                      {chapter.fictional ? " · 虚构例子" : ""}
                    </span>
                  </div>
                  <h2>{chapter.title}</h2>
                  {chapter.body
                    .split(/\n+/)
                    .filter(Boolean)
                    .map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  {chapter.visual.items.length > 0 && (
                    <Visual chapter={chapter} />
                  )}
                  <div className="z-chapter-foot">
                    <button
                      className="z-source-button"
                      onClick={() => showSource(chapter.sourceIds)}
                    >
                      查看对应原文
                    </button>
                    <a
                      href={endpoint(`/lessons/${lesson.id}/diagram/${index}`)}
                    >
                      <Download size={15} />
                      保存图解
                    </a>
                  </div>
                </section>
              ))}
            </div>
            <section className="z-takeaways">
              <span className="z-kicker">带走这几个判断</span>
              <ul>
                {result.takeaways.map((t, i) => (
                  <li key={i}>
                    <Check size={18} />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </section>
            {result.quiz.length > 0 && (
              <details className="z-detail z-quiz">
                <summary>想试一下理解了吗？（可跳过）</summary>
                {result.quiz.map((q, i) => (
                  <section key={i}>
                    <h3>{q.question}</h3>
                    <div className="z-choices">
                      {q.options.map((o, j) => (
                        <button
                          key={j}
                          className={`z-choice ${quiz[i] === j ? "selected" : ""}`}
                          aria-pressed={quiz[i] === j}
                          onClick={() => setQuiz({ ...quiz, [i]: j })}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                    {quiz[i] !== undefined && (
                      <p className="z-answer" role="status">
                        <strong>
                          {quiz[i] === q.correct
                            ? "这个判断与本篇解释一致。"
                            : "可以换个角度看看。"}
                        </strong>
                        {q.explanation}
                      </p>
                    )}
                    <button
                      className="z-text-link"
                      onClick={() => setQuiz({ ...quiz, [i]: q.correct })}
                    >
                      直接看解释
                    </button>
                  </section>
                ))}
              </details>
            )}
            <section className="z-feedback">
              <h3>这版让你更容易开始学习了吗？</h3>
              <div>
                <button
                  className="button button-quiet"
                  aria-pressed={feedback === true}
                  onClick={() => void record(true, lesson.completed)}
                >
                  更容易了
                </button>
                <button
                  className="button button-quiet"
                  aria-pressed={feedback === false}
                  onClick={() => void record(false, lesson.completed)}
                >
                  还不够
                </button>
                <button
                  className="button button-primary"
                  onClick={() => void record(feedback, !lesson.completed)}
                >
                  {lesson.completed ? (
                    <>
                      <Check size={16} />
                      已完成，点击取消
                    </>
                  ) : (
                    "标记学完"
                  )}
                </button>
              </div>
              <p>反馈不会自动改写你的个人 Skill。</p>
            </section>
          </div>
        </div>
      )}
      {chapterOpen && result && (
        <Modal title="章节目录" onClose={() => setChapterOpen(false)}>
          <nav className="z-directory-dialog" aria-label="选择章节">
            {result.chapters.map((c, i) => (
              <button
                type="button"
                key={c.id}
                aria-current={activeChapter === i ? "step" : undefined}
                onClick={() => selectChapter(i)}
              >
                <span>{String(i + 1).padStart(2, "0")}</span>
                {c.title}
              </button>
            ))}
          </nav>
        </Modal>
      )}
      {sourceOpen && lesson.source && (
        <Modal title="原文与来源" onClose={() => setSourceOpen(false)}>
          <h3>{lesson.source.title}</h3>
          <p className="z-help">
            {lesson.source.mode === "sample"
              ? "知径自编体验文章，数据为虚构示例。"
              : lesson.source.mode === "text"
                ? "由你提交的正文。AI 的解释不等于原文事实已被独立核验。"
                : "从公开链接提取的正文。作者陈述不等于已被独立核验。"}
          </p>
          {lesson.source.url && (
            <a
              className="z-text-link"
              href={lesson.source.url}
              target="_blank"
              rel="noreferrer"
            >
              在知乎查看原文 ↗
            </a>
          )}
          {focus.length > 0 && (
            <button className="z-text-link" onClick={() => setFocus([])}>
              显示全部段落
            </button>
          )}
          {lesson.source.blocks
            .filter((b) => !focus.length || focus.includes(b.id))
            .map((b) => (
              <section className="z-source-paragraph" key={b.id}>
                <strong>{b.id}</strong>
                <p>{b.text}</p>
              </section>
            ))}
          <button
            className="button button-quiet"
            onClick={() => setSourceOpen(false)}
          >
            返回学习
          </button>
        </Modal>
      )}
    </main>
  );
}
