/* Featured cover from the published work, not a mock player. */
/* eslint-disable @next/next/no-img-element */
import { ArrowRight, Play } from "lucide-react";
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
  return (
    <main className="z-container z-welcome-visual">
      <section className="z-welcome-intro">
        <div className="z-welcome-copy">
          <StaggeredText
            as="h1"
            text={"长文，\n换一种读法。"}
            segmentBy="lines"
            blur={false}
            delay={140}
            duration={0.65}
            easing={[0.22, 1, 0.36, 1]}
            from={{ opacity: 1, y: 20 }}
            to={{ opacity: 1, y: 0 }}
            respectReducedMotion
          />
          <p>图文、声音、影像。用你喜欢的方式理解。</p>
          <button
            className="button button-primary button-large"
            onClick={onStart}
          >
            找到我的学法 <ArrowRight size={18} />
          </button>
          <span className="z-welcome-meta">8 题 · 约 2 分钟</span>
          {returning && onContinue && (
            <button
              className="z-text-link z-welcome-return"
              onClick={onContinue}
            >
              继续学习 <ArrowRight size={16} />
            </button>
          )}
        </div>
        <a
          className="z-featured-work"
          href={`${base}/demo/zhihu-window-20260908/?ui=rice-20260910`}
          aria-label="查看学习作品示例：窗口期可能只剩五年"
        >
          <div className="z-featured-cover">
            <img
              src={`${base}/images/window-cover.jpg?v=rice-20260910`}
              width={1280}
              height={720}
              fetchPriority="high"
              alt="作品中的思想实验：企业提效与家庭收入为什么可能不同步"
            />
            <span className="z-featured-open">
              <Play size={18} aria-hidden="true" /> 进入作品
            </span>
          </div>
          <div className="z-featured-caption">
            <span>学习作品 · 示例</span>
            <h2>窗口期可能只剩五年</h2>
            <ArrowRight size={24} aria-hidden="true" />
          </div>
        </a>
      </section>
    </main>
  );
}
