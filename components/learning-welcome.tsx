/* Static WebP is pre-optimized; serve directly without an image transformation service. */
/* eslint-disable @next/next/no-img-element */
import { useRef } from "react";
import type { PointerEvent } from "react";
import {
  ArrowRight,
  BookOpen,
  Headphones,
  MonitorPlay,
  Play,
} from "lucide-react";
import StaggeredText from "./react-bits/staggered-text";
import { base } from "./learning-ui";

export function Welcome({
  onStart,
  onContinue,
  returning = false,
}: {
  onStart: () => void;
  onContinue?: () => void;
  returning?: boolean;
}) {
  const heroRef = useRef<HTMLElement>(null);
  function moveHero(event: PointerEvent<HTMLElement>) {
    const hero = heroRef.current;
    if (
      !hero ||
      event.pointerType !== "mouse" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      hero.closest('[data-motion="off"]')
    )
      return;
    const bounds = hero.getBoundingClientRect();
    const x = Math.max(
      -1,
      Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1),
    );
    const y = Math.max(
      -1,
      Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1),
    );
    hero.style.setProperty("--hero-x", `${x * 1.7}deg`);
    hero.style.setProperty("--hero-y", `${-y * 1.7}deg`);
  }
  function resetHero() {
    heroRef.current?.style.setProperty("--hero-x", "0deg");
    heroRef.current?.style.setProperty("--hero-y", "0deg");
  }
  return (
    <main className="z-container z-welcome-visual">
      <section className="z-welcome-intro">
        <div className="z-welcome-copy">
          <span className="z-kicker">让长文更容易开始</span>
          <StaggeredText
            as="h1"
            text={"知识不必难读。\n换成你的讲法。"}
            segmentBy="lines"
            blur={false}
            delay={140}
            duration={0.65}
            easing={[0.22, 1, 0.36, 1]}
            from={{ opacity: 1, y: 20 }}
            to={{ opacity: 1, y: 0 }}
            respectReducedMotion
          />
          <p>
            一篇文章，可以看、可以听，
            <br />
            也可以一步步弄明白。
          </p>
          <button
            className="button button-primary button-large"
            onClick={onStart}
          >
            找到我的学法 <ArrowRight size={18} />
          </button>
          {returning && onContinue && (
            <button
              className="z-text-link z-welcome-return"
              onClick={onContinue}
            >
              继续原来的学习 <ArrowRight size={16} />
            </button>
          )}
          <span className="z-welcome-meta">8 题 · 约 2 分钟 · 随时可改</span>
          {returning && (
            <p className="z-revisit-note">
              可以从头体验；原有作品保留，学法保存后才更新。
            </p>
          )}
        </div>
        <figure
          className="z-learning-hero"
          ref={heroRef}
          onPointerMove={moveHero}
          onPointerLeave={resetHero}
        >
          <img
            src={`${base}/images/learning-paths-v1.webp`}
            width={1536}
            height={1024}
            fetchPriority="high"
            alt="一张长文沿着纸带，变成视频画面、图文读本和听读音频"
          />
          <figcaption>
            <span>
              <MonitorPlay size={18} />
              看讲解
            </span>
            <span>
              <BookOpen size={18} />
              读图文
            </span>
            <span>
              <Headphones size={18} />
              听内容
            </span>
          </figcaption>
        </figure>
      </section>
      <section className="z-welcome-bottom" aria-label="从偏好到学习作品">
        <ol className="z-journey-strip">
          <li>
            <span>01</span>
            <div>
              <strong>选你喜欢的讲法</strong>
              <small>看示例，不用给自己分类</small>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>放进一篇文章</strong>
              <small>知乎链接或粘贴正文</small>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>开始你的学习</strong>
              <small>按你的节奏，随时继续</small>
            </div>
          </li>
        </ol>
        <a
          className="z-example-link"
          href={`${base}/demo/zhihu-window-20260908/?ui=2ad9b72`}
        >
          <span className="z-example-poster">
            <img
              src={`${base}/demo/zhihu-window-20260908/media/poster.jpg`}
              width={256}
              height={144}
              alt="《窗口期可能只剩五年》学习作品封面"
              loading="lazy"
            />
            <Play size={18} aria-hidden="true" />
          </span>
          <span>
            <small>先看一份成品 · 示例偏好</small>
            <strong>窗口期可能只剩五年</strong>
            <span>视频 / 图解 / 听读</span>
          </span>
          <ArrowRight size={19} />
        </a>
      </section>
    </main>
  );
}
