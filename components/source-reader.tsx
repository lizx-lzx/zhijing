"use client";
import { useEffect, useRef, useState } from "react";

// Only literal correspondence is highlighted as a sentence. Paraphrases without
// a verified text match retain their paragraph-level source association.
export function sourceSentences(text: string, explanation: string) {
  const fragments = explanation
    .split(/[。！？!?；;\n，,：:]/u)
    .map((s) => s.trim())
    .filter((s) => s.length >= 12);
  return (
    text.match(/[^。！？!?\n]+[。！？!?\n]*|[。！？!?\n]+/gu) || [text]
  ).map((sentence) => ({
    text: sentence,
    matched: fragments.some((fragment) => sentence.includes(fragment)),
  }));
}

export function SourceReader({
  blocks,
  ids,
  explanation = "",
  onClose,
}: {
  blocks: { id: string; text: string }[];
  ids: string[];
  explanation?: string;
  onClose: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const targets = blocks.filter((b) => ids.includes(b.id));
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const target = root.current?.querySelectorAll<HTMLElement>(
        "[data-source-target]",
      )[current];
      const dialog = root.current?.closest("dialog");
      if (target && dialog) {
        // Scroll only the source dialog; keep the underlying learning position.
        dialog.scrollTop +=
          target.getBoundingClientRect().top -
          dialog.getBoundingClientRect().top -
          180;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [current]);
  return (
    <div ref={root} className="z-source-reader">
      <div className="z-source-tools">
        <span>
          {targets.length
            ? `对应原文 ${current + 1} / ${targets.length}`
            : ids.length
              ? "未找到对应段落，以下是已保存原文"
              : "已保存原文"}
        </span>
        <button className="z-text-link" onClick={onClose}>
          返回讲解
        </button>
        {targets.length > 1 && (
          <div>
            <button
              className="z-text-link"
              disabled={current === 0}
              onClick={() => setCurrent(current - 1)}
            >
              上一处
            </button>
            <button
              className="z-text-link"
              disabled={current === targets.length - 1}
              onClick={() => setCurrent(current + 1)}
            >
              下一处
            </button>
          </div>
        )}
      </div>
      {!blocks.length && <p>这份作品没有保存原文，请通过上方来源链接查看。</p>}
      {blocks.map((b, i) => {
        const targeted = ids.includes(b.id);
        const sentences = sourceSentences(b.text, explanation);
        const exact = targeted && sentences.some((s) => s.matched);
        return (
          <section
            key={b.id}
            className="z-source-paragraph"
            data-source-target={targeted ? b.id : undefined}
          >
            <strong>
              第 {i + 1} 段
              {targeted
                ? exact
                  ? " · 相关句已高亮"
                  : " · 对应段落（未精确到句）"
                : ""}
            </strong>
            <p>
              {sentences.map((s, n) =>
                targeted && (exact ? s.matched : true) ? (
                  <mark
                    key={n}
                    data-highlight={exact ? "sentence" : "paragraph"}
                  >
                    {s.text}
                  </mark>
                ) : (
                  <span key={n}>{s.text}</span>
                ),
              )}
            </p>
          </section>
        );
      })}
    </div>
  );
}
