import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { SlideCanvas } from "@openmaic/renderer";
import lesson from "./lesson.json";
import timing from "./timing.json";
import { locateSegment, captionAt } from "./contract.mjs";
import "./style.css";

const capture = new URLSearchParams(location.search).has("capture");
const clock = (value) =>
  `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
const duration = timing.segments.at(-1).end;
const sceneStarts = lesson.scenes.map(
  (_, i) => timing.segments.find((s) => s.scene === i).start,
);

function App() {
  const [time, setTime] = useState(0);
  const [mode, setMode] = useState(timing.voiceReady ? "video" : "slides");
  const [error, setError] = useState("");
  const video = useRef(null);
  const audio = useRef(null);
  const canvasBox = useRef(null);
  const current = locateSegment(timing.segments, time);
  const index = current.scene;
  const scene = lesson.scenes[index];
  const effects = current.effect
    ? {
        [current.effect.type]: {
          elementId: current.effect.elementId,
          dimness: 0.22,
          color: "#ee7145",
          opacity: 0.16,
          animated: false,
        },
      }
    : {};
  useEffect(() => {
    if (!capture) return;
    document.body.classList.add("capture");
    // A deterministic host seam used only to render this approved, generated sample.
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
  if (capture)
    return (
      <div className="capture-layout">
        {canvas}
        <div className="capture-caption">{captionAt(current, time)}</div>
        <div
          className="capture-progress"
          style={{ width: `${(time / duration) * 100}%` }}
        />
      </div>
    );
  return (
    <>
      <header className="topbar">
        <a className="brand" href="/zhijing/">
          <span>径</span>知径
        </a>
        <span className="trial">讲解试作</span>
      </header>
      <main>
        <div className="heading">
          <div>
            <p className="eyebrow">从一个小困惑，理解一个统计概念</p>
            <h1>
              人均六本，为什么
              <br className="mobile-break" />
              四个人都没达到？
            </h1>
          </div>
          <span className="length">
            {timing.voiceReady ? `${clock(duration)} · ` : ""}4 个片段
          </span>
        </div>
        <div className="preference">
          <span>这次的讲法</span>
          <strong>先讲故事</strong>
          <i>·</i>
          <strong>图解配讲解</strong>
          <i>·</i>
          <strong>不中途提问</strong>
        </div>
        <section className="lesson-layout" aria-label="学习作品">
          <div className="player-column">
            <div className="view-tabs" role="group" aria-label="观看方式">
              <button
                type="button"
                disabled={!timing.voiceReady}
                aria-pressed={mode === "video"}
                onClick={() => switchMode("video")}
              >
                观看讲解
              </button>
              <button
                type="button"
                aria-pressed={mode === "slides"}
                onClick={() => switchMode("slides")}
              >
                逐页看图
              </button>
            </div>
            <div className="player">
              {mode === "video" ? (
                <video
                  ref={video}
                  controls
                  playsInline
                  preload="metadata"
                  poster="./media/poster.jpg"
                  aria-label="平均数与中位数讲解视频"
                  onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
                  onLoadedMetadata={(e) => {
                    e.currentTarget.currentTime = time;
                  }}
                  onError={() =>
                    setError("视频未能加载，可以切换到「逐页看图」继续观看。")
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
              ) : (
                <>
                  {canvas}
                  <div className="spoken" aria-live="off">
                    {current.text}
                  </div>
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
                    <audio
                      ref={audio}
                      controls
                      preload="metadata"
                      src="./media/audio.m4a"
                      aria-label="逐页讲解音频"
                      onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
                      onLoadedMetadata={(e) => {
                        e.currentTarget.currentTime = time;
                      }}
                      onError={() =>
                        setError("配音未能加载，下方保留了完整讲稿。")
                      }
                    />
                  ) : (
                    <p className="data-note" style={{ padding: "0 18px 15px" }}>
                      图解可以先看，配音正在制作。
                    </p>
                  )}
                </>
              )}
            </div>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <p className="data-note">
              示例里的五人读书组及阅读量均为虚构数据。
            </p>
          </div>
          <aside className="chapters" aria-label="讲解片段">
            <p className="eyebrow">这一段在讲什么</p>
            {lesson.scenes.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={i === index ? "chapter active" : "chapter"}
                aria-current={i === index ? "step" : undefined}
                onClick={() => seek(sceneStarts[i])}
              >
                <span className="chapter-no">0{i + 1}</span>
                <span className="chapter-title">
                  {s.title}
                  <small>{clock(sceneStarts[i])}</small>
                </span>
                <span className="chapter-dot" aria-hidden="true" />
              </button>
            ))}
            <div className="takeaway">
              <span>看完带走一句话</span>
              <p>
                平均数没有算错。
                <br />
                它回答的问题，未必是你想问的那个。
              </p>
            </div>
          </aside>
        </section>
        <section className="reading" aria-label="讲稿和来源">
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
            <summary>查看原文与这次的学习规则</summary>
            <div className="reading-body">
              <h2>原文</h2>
              {lesson.source.split("\n\n").map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              <h2>示例学习规则</h2>
              <p>这是试作用的模拟偏好，不是对你的个人测评。</p>
              {lesson.profile.rules.map((r) => (
                <p key={r.id}>
                  <strong>{r.title}：</strong>
                  {r.instruction}
                </p>
              ))}
            </div>
          </details>
        </section>
        <footer>
          知径 × OpenMAIC · 单篇预生成试作，尚未替换正式网站的生成流程。
          <a href="./THIRD-PARTY-NOTICES.txt">开源说明</a>
        </footer>
      </main>
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
