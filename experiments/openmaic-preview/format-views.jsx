import React, { useRef, useState } from "react";
import { makeReviewCards } from "./learning-formats.mjs";

// Text nodes reflow natively: this is a relation diagram, not a resized screenshot.
export function InlineDiagram({ diagram }) {
  const linked = ["flow", "cycle", "ladder", "timeline"].includes(
    diagram.layout,
  );
  return (
    <figure
      className={`inline-diagram inline-${diagram.layout}`}
      aria-label={diagram.subtitle}
    >
      <figcaption>{diagram.subtitle}</figcaption>
      <div className="inline-paths">
        {diagram.groups.map((nodes, g) => (
          <div className="inline-path" key={g}>
            {nodes.map((node, i) => (
              <React.Fragment key={i}>
                {i > 0 && (
                  <span className="inline-arrow" aria-hidden="true">
                    {linked ? "↓" : diagram.layout === "contrast" ? "≠" : "·"}
                  </span>
                )}
                <div className="inline-node">
                  <strong>{node.title}</strong>
                  <span>{node.detail}</span>
                </div>
              </React.Fragment>
            ))}
            {diagram.layout === "cycle" && (
              <p className="inline-return">↩ 可能再强化起点</p>
            )}
          </div>
        ))}
      </div>
      <p className="inline-note">{diagram.note}</p>
    </figure>
  );
}

export function Overview({ lesson, onRead, activeChapter, onSelect }) {
  const { overview } = lesson.learningFormats;
  const [localSelected, setSelected] = useState(lesson.scenes[0].id);
  const selected = activeChapter || localSelected;
  const detail = useRef(null);
  const scene = lesson.scenes.find((s) => s.id === selected);
  const loop = lesson.scenes.find((s) => s.id === overview.loopChapter);
  return (
    <div className="format-view overview-view">
      <p className="eyebrow">全文关系图</p>
      <h2>{overview.title}</h2>
      <p className="format-intro">{overview.note}</p>
      <div className="overview-grid">
        {overview.groups.map((group, i) => (
          <section className="overview-branch" key={group.title}>
            <h3>{group.title}</h3>
            <p>{group.description}</p>
            {group.chapters.map((id) => {
              const chapter = lesson.scenes.find((s) => s.id === id);
              return (
                <button
                  type="button"
                  key={id}
                  aria-pressed={id === selected}
                  onClick={() => {
                    setSelected(id);
                    onSelect?.(id);
                    requestAnimationFrame(() =>
                      detail.current?.scrollIntoView({
                        block: "nearest",
                        behavior: "instant",
                      }),
                    );
                  }}
                >
                  {chapter.title}
                  <span aria-hidden="true">↗</span>
                </button>
              );
            })}
          </section>
        ))}
      </div>
      <section
        ref={detail}
        className="map-detail"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="eyebrow">{scene.kind}</span>
        <h3>{scene.title}</h3>
        <p>{scene.takeaway}</p>
        <p className="format-condition">成立条件：{scene.premise}</p>
        <button
          className="text-action"
          type="button"
          onClick={() => onRead(scene.id)}
        >
          读这一章 →
        </button>
      </section>
      <details className="format-details">
        <summary>把反馈循环连起来看</summary>
        <InlineDiagram diagram={loop.diagram} />
      </details>
    </div>
  );
}

export function Practice({
  lesson,
  onRead,
  answers,
  onAnswer,
  cardIndex,
  onCard,
  revealed,
  onReveal,
  view,
  onView,
  scenarioIndex,
  onScenario,
}) {
  const scenarios = lesson.learningFormats.scenarios;
  const scenario = scenarios[scenarioIndex];
  const picked = scenario.options.find((o) => o.id === answers[scenario.id]);
  const cards = makeReviewCards(lesson);
  const card = cards[cardIndex];
  return (
    <div className="format-view practice-view">
      <p className="eyebrow">可选练习 · 不计分，不改变你的学习偏好</p>
      <div className="practice-tabs" role="group" aria-label="互动方式">
        <button
          type="button"
          aria-pressed={view === "scenarios"}
          onClick={() => onView("scenarios")}
        >
          推演一下
        </button>
        <button
          type="button"
          aria-pressed={view === "cards"}
          onClick={() => onView("cards")}
        >
          十张复习卡
        </button>
      </div>
      {view === "scenarios" ? (
        <>
          <nav className="scenario-nav" aria-label="推演主题">
            {scenarios.map((s, i) => (
              <button
                type="button"
                key={s.id}
                aria-pressed={i === scenarioIndex}
                onClick={() => onScenario(i)}
              >
                情境 {i + 1}
              </button>
            ))}
          </nav>
          <section className="scenario-body" aria-label={scenario.title}>
            <h2>{scenario.title}</h2>
            <p>{scenario.setup}</p>
            <p className="scenario-notice">教学假设，不是经济预测</p>
            <div
              className="scenario-options"
              role="group"
              aria-label="改变一个条件"
            >
              {scenario.options.map((o) => (
                <button
                  type="button"
                  key={o.id}
                  aria-pressed={picked?.id === o.id}
                  onClick={() => onAnswer(scenario.id, o.id)}
                >
                  {o.label}
                  <span>{picked?.id === o.id ? "正在看" : "看看会怎样 →"}</span>
                </button>
              ))}
            </div>
            <div
              className="scenario-result"
              aria-live="polite"
              aria-atomic="true"
            >
              {picked ? (
                <>
                  <ol className="result-path">
                    {picked.path.map((step, i) => (
                      <li key={step}>
                        <span>{i + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                  <p>{picked.explanation}</p>
                  <p className="key-line">{scenario.takeaway}</p>
                </>
              ) : (
                <p className="format-intro">
                  选一个条件看变化，也可以直接回到正文。
                </p>
              )}
            </div>
            <button
              className="text-action"
              type="button"
              onClick={() => onRead(scenario.chapter)}
            >
              回到对应章节 →
            </button>
          </section>
        </>
      ) : (
        <>
          <div className="card-counter">
            {cardIndex + 1} / {cards.length}
            <span>先想一想，或直接看答案</span>
          </div>
          <section
            className="recall-card"
            aria-label={`复习卡 ${cardIndex + 1}`}
          >
            <h2>{card.question}</h2>
            <button
              className="answer-toggle"
              type="button"
              aria-expanded={revealed}
              onClick={() => onReveal(!revealed)}
            >
              {revealed ? "收起答案" : "看答案"}
            </button>
            {revealed && (
              <div className="card-answer">
                <p>{card.answer}</p>
                <p className="format-condition">成立条件：{card.premise}</p>
                <details>
                  <summary>对应原文短引</summary>
                  <blockquote>{card.sourceAnchor.quote}</blockquote>
                  <p className="data-note">
                    用户提供文本 · 第 {card.sourceAnchor.startLine} 行
                  </p>
                </details>
              </div>
            )}
            <button
              className="text-action"
              type="button"
              onClick={() => onRead(card.id)}
            >
              回到这一章 →
            </button>
          </section>
          <div className="card-navigation">
            <button
              type="button"
              disabled={cardIndex === 0}
              onClick={() => onCard(cardIndex - 1)}
            >
              上一张
            </button>
            <button
              type="button"
              disabled={cardIndex === cards.length - 1}
              onClick={() => onCard(cardIndex + 1)}
            >
              下一张
            </button>
          </div>
          <a className="text-action" href="./learning-formats.md" download>
            下载全部复习卡 ↓
          </a>
        </>
      )}
    </div>
  );
}
