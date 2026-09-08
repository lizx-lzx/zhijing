import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { SlideCanvas } from "@openmaic/renderer";
import lesson from "@lesson";
import timing from "@timing";
import { locateSegment, captionAt } from "./contract.mjs";
import "./style.css";

const query = new URLSearchParams(location.search);
const capture = query.has("capture"),
  still = query.has("still");
const clock = (value) =>
  `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
const duration = timing.segments.at(-1).end;
const sceneStarts = lesson.scenes.map(
  (_, i) => timing.segments.find((s) => s.scene === i).start,
);
const title = lesson.title;
const sourceNote =
  lesson.sourceNote || "示例里的五人读书组及阅读量均为虚构数据。";
const thesis =
  lesson.thesis || "平均数没有算错。它回答的问题，未必是你想问的那个。";
const preferences = lesson.preference || [
  "先讲故事",
  "图解配讲解",
  "不中途提问",
];

function App() {
  const [time, setTime] = useState(0);
  const [mode, setMode] = useState(timing.voiceReady ? "video" : "slides");
  const [error, setError] = useState("");
  const video = useRef(null),
    audio = useRef(null),
    canvasBox = useRef(null);
  const current = locateSegment(timing.segments, time);
  const index = current.scene,
    scene = lesson.scenes[index];
  const effects =
    !still && current.effect
      ? {
          [current.effect.type]: {
            elementId: current.effect.elementId,
            dimness: 0.22,
            color: "#9cabff",
            opacity: 0.1,
            animated: false,
          },
        }
      : {};
  useEffect(() => {
    document.title = `${title} · 知径`;
    if (!capture) return;
    document.body.classList.add("capture");
    window.renderAt = (at) => {
      flushSync(() => setTime(Math.max(0, Math.min(at, duration - 0.001))));
      return new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
    };
    window.previewReady = true;
    return () => {
      delete window.renderAt;
      delete window.previewReady;
    };
  }, []);
  const seek = (at) => {
    const bounded = Math.max(0, Math.min(at, duration - 0.01));
    setTime(bounded);
    if (video.current) video.current.currentTime = bounded;
    if (audio.current) audio.current.currentTime = bounded;
  };
  const switchMode = (next) => {
    video.current?.pause();
    audio.current?.pause();
    setMode(next);
    setError("");
  };
  const canvas = (
    <div className="canvas" ref={canvasBox}>
      <SlideCanvas
        slide={scene.content.canvas}
        effects={effects}
        chrome={false}
      />
    </div>
  );
  const audioPlayer = (
    <audio
      ref={audio}
      controls
      preload="metadata"
      src="./media/audio.m4a"
      aria-label="完整讲解音频"
      onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
      onLoadedMetadata={(e) => {
        e.currentTarget.currentTime = time;
      }}
      onError={() => setError("配音未能加载，文字梳理和图解仍可阅读。")}
    />
  );
  if (capture)
    return (
      <div className="capture-layout">
        {canvas}
        <div className="capture-caption">
          {still ? scene.takeaway || thesis : captionAt(current, time)}
        </div>
        {!still && (
          <div
            className="capture-progress"
            style={{ width: `${(time / duration) * 100}%` }}
          />
        )}
      </div>
    );
  return (
    <>
      <header className="topbar">
        <a className="brand" href="/zhijing/">
          <span>径</span>知径
        </a>
        <span className="trial">文章学习作品</span>
      </header>
      <main>
        <div className="heading">
          <div>
            <p className="eyebrow">
              {lesson.sourceMeta
                ? `${lesson.author} · 知乎文章`
                : "从一个小困惑，理解一个统计概念"}
            </p>
            <h1>{title}</h1>
          </div>
          <span className="length">
            {timing.voiceReady ? `${clock(Math.ceil(duration))} · ` : ""}
            {lesson.scenes.length} 个章节
          </span>
        </div>
        {lesson.intro && <p className="article-intro">{lesson.intro}</p>}
        <div className="preference">
          <span>这次的讲法</span>
          {preferences.map((p) => (
            <strong key={p}>{p}</strong>
          ))}
        </div>
        <section className="lesson-layout" aria-label="学习作品">
          <div className="player-column">
            <div className="view-tabs" role="group" aria-label="观看方式">
              {[
                ["video", "观看讲解"],
                ["slides", "逐页看图"],
                ["audio", "只听音频"],
                ["reading", "文字梳理"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  disabled={
                    !timing.voiceReady && ["audio", "video"].includes(key)
                  }
                  aria-pressed={mode === key}
                  onClick={() => switchMode(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="player">
              {mode === "video" && (
                <video
                  ref={video}
                  controls
                  playsInline
                  preload="metadata"
                  poster="./media/poster.jpg"
                  aria-label={`${title}讲解视频`}
                  onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
                  onLoadedMetadata={(e) => {
                    e.currentTarget.currentTime = time;
                  }}
                  onError={() =>
                    setError("视频未能加载，可以切到图解或文字继续学习。")
                  }
                >
                  <source src="./media/video.mp4" type="video/mp4" />
                  <track
                    kind="captions"
                    src="./media/captions.vtt"
                    srcLang="zh"
                    label="中文"
                  />
                </video>
              )}
              {mode === "slides" && (
                <>
                  {canvas}
                  <div className="spoken">{current.text}</div>
                  <div className="slide-controls">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => seek(sceneStarts[index - 1])}
                    >
                      上一页
                    </button>
                    <span>
                      {index + 1} / {lesson.scenes.length}
                    </span>
                    <button
                      type="button"
                      disabled={index === lesson.scenes.length - 1}
                      onClick={() => seek(sceneStarts[index + 1])}
                    >
                      下一页
                    </button>
                    <button
                      type="button"
                      className="expand"
                      onClick={() => canvasBox.current.requestFullscreen?.()}
                    >
                      放大画面
                    </button>
                  </div>
                  {timing.voiceReady ? (
                    audioPlayer
                  ) : (
                    <p className="data-note">图文已整理，配音正在制作。</p>
                  )}
                </>
              )}
              {mode === "audio" && (
                <div className="audio-view">
                  <p className="eyebrow">闭上眼，也能跟上这条逻辑</p>
                  <h2>{scene.title}</h2>
                  <p>{current.text}</p>
                  {audioPlayer}
                  <p className="data-note">
                    可从章节跳转，也可以切回视频继续看。
                  </p>
                </div>
              )}
              {mode === "reading" && (
                <div className="long-reading">
                  <p className="eyebrow">完整梳理 · 保留观点、前提和原文定位</p>
                  <h2>{thesis}</h2>
                  {lesson.scenes.map((s, i) => (
                    <section
                      id={`reading-${s.id}`}
                      key={s.id}
                      className="reading-chapter"
                    >
                      <h3>
                        <span>{String(i + 1).padStart(2, "0")}</span>
                        {s.title}
                      </h3>
                      {(
                        s.reading ||
                        s.actions
                          .filter((a) => a.type === "speech")
                          .map((a) => a.text)
                      ).map((p, n) => (
                        <p key={n}>{p}</p>
                      ))}
                      {s.takeaway && <p className="key-line">{s.takeaway}</p>}
                      {s.premise && (
                        <details>
                          <summary>这一步成立，需要什么条件？</summary>
                          <p>{s.premise}</p>
                        </details>
                      )}
                      {s.sourceAnchor && (
                        <details>
                          <summary>对应原文</summary>
                          <blockquote>{s.sourceAnchor.quote}</blockquote>
                          <p className="data-note">
                            用户提供文本 · 第 {s.sourceAnchor.startLine} 行
                          </p>
                        </details>
                      )}
                    </section>
                  ))}
                </div>
              )}
            </div>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <p className="data-note">{sourceNote}</p>
          </div>
          <aside className="chapters" aria-label="讲解片段">
            <p className="eyebrow">这一段在讲什么</p>
            {lesson.scenes.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={`chapter${i === index ? " active" : ""}`}
                aria-current={i === index ? "step" : undefined}
                onClick={() => {
                  seek(sceneStarts[i]);
                  if (mode === "reading")
                    document
                      .getElementById(`reading-${s.id}`)
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                <span className="chapter-no">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="chapter-title">
                  {s.title}
                  <small>{clock(sceneStarts[i])}</small>
                </span>
                <span className="chapter-dot" aria-hidden="true" />
              </button>
            ))}
            <div className="takeaway">
              <span>看完带走一句话</span>
              <p>{thesis}</p>
            </div>
          </aside>
        </section>
        <section className="reading" aria-label="补充学习资料">
          {lesson.glossary && (
            <details>
              <summary>术语速查</summary>
              <div className="reading-body glossary">
                {lesson.glossary.map(([term, definition]) => (
                  <div key={term}>
                    <h3>{term}</h3>
                    <p>{definition}</p>
                  </div>
                ))}
              </div>
            </details>
          )}
          {lesson.checks && (
            <details>
              <summary>哪些是事实，哪些是推演？</summary>
              <div className="reading-body">
                <p>
                  只核验几个关键说法，不是对整篇文章的事实认证。原文写作语境是
                  2026 年 2 月；下方后续研究单独标明日期。
                </p>
                {lesson.checks.map((c) => (
                  <section className="claim-check" key={c.label}>
                    <span className="status-label">{c.status}</span>
                    <h3>{c.label}</h3>
                    <p>{c.text}</p>
                    {c.links.map((l) => (
                      <a
                        className="source-link"
                        key={l.url}
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {l.title} ↗
                      </a>
                    ))}
                  </section>
                ))}
              </div>
            </details>
          )}
          {lesson.reviewQuestions && (
            <details>
              <summary>想确认理解？三个小问题（可跳过）</summary>
              <div className="reading-body">
                {lesson.reviewQuestions.map((q) => (
                  <section className="self-check" key={q.question}>
                    <h3>{q.question}</h3>
                    <details>
                      <summary>查看参考理解</summary>
                      <p>{q.answer}</p>
                    </details>
                  </section>
                ))}
              </div>
            </details>
          )}
          <details>
            <summary>展开完整讲稿</summary>
            <div className="reading-body">
              {lesson.scenes.map((s, i) => (
                <section key={s.id}>
                  <h2>
                    {i + 1}. {s.title}
                  </h2>
                  {timing.segments
                    .filter((seg) => seg.scene === i)
                    .map((seg, n) => (
                      <p key={n}>{seg.text}</p>
                    ))}
                </section>
              ))}
            </div>
          </details>
          <details>
            <summary>来源与本次学习规则</summary>
            <div className="reading-body">
              {lesson.sourceMeta ? (
                <>
                  <h2>{lesson.sourceMeta.title}</h2>
                  <p>
                    {lesson.sourceMeta.author} · {lesson.sourceMeta.context}
                  </p>
                  <p>
                    {lesson.sourceMeta.acquisition}
                    。页面只展示改编讲解和必要的短引，不重新公开整篇原文。
                  </p>
                  <a
                    className="source-link"
                    href={lesson.sourceMeta.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    用户提供的原始链接 ↗
                  </a>
                </>
              ) : (
                <>
                  <h2>原文</h2>
                  {lesson.source.split("\n\n").map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </>
              )}
              <h2>本次学习规则</h2>
              <p>
                沿用故事开场、图解配讲解、不打断的示例偏好，不是重新对你进行测评。
              </p>
              {lesson.profile.rules.map((r) => (
                <p key={r.id}>
                  <strong>{r.title}：</strong>
                  {r.instruction}
                </p>
              ))}
            </div>
          </details>
        </section>
        {timing.voiceReady && (
          <section className="downloads" aria-label="带走学习作品">
            <h2>带走这份学习作品</h2>
            <div className="download-links">
              <a download href="./media/video.mp4">
                讲解视频 ↓
              </a>
              <a download href="./media/audio.m4a">
                完整音频 ↓
              </a>
              {lesson.sourceMeta && (
                <>
                  <a download href="./learning-notes.md">
                    学习笔记 ↓
                  </a>
                  <a download href="./learning-skill.md">
                    学习 Skill ↓
                  </a>
                  <a download href="./media/captions.vtt">
                    中文字幕 ↓
                  </a>
                </>
              )}
            </div>
            {lesson.sourceMeta && (
              <details>
                <summary>下载章节图解</summary>
                <div className="diagram-links">
                  {lesson.scenes.map((s, i) => (
                    <a
                      key={s.id}
                      download
                      href={`./diagrams/chapter-${i + 1}.png`}
                    >
                      {String(i + 1).padStart(2, "0")} {s.title} ↓
                    </a>
                  ))}
                </div>
              </details>
            )}
          </section>
        )}
        <footer>
          知径 × OpenMAIC · 单篇学习作品，尚未替换正式网站的通用生成流程。
          <a href="./THIRD-PARTY-NOTICES.txt">开源说明</a>
        </footer>
      </main>
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
