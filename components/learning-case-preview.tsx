"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { ArrowUpRight, Play } from "lucide-react";
import { mediaLabels } from "../lib/domain";
import type { Medium } from "../lib/domain";
import { base, Modal } from "./learning-ui";

// These are supported modes of the existing, source-reviewed public article.
const caseModes: Record<Medium, string> = {
  video: "video",
  reading: "reading",
  audio: "audio",
  animation: "overview",
};
export const casePreviewUrl = (medium: Medium) =>
  `${base}/demo/zhihu-window-20260908/?ui=2ad9b72&mode=${caseModes[medium]}`;

export function ArticleCaseDialog({
  medium,
  onChange,
  onClose,
}: {
  medium: Medium;
  onChange: (medium: Medium) => void;
  onClose: () => void;
}) {
  return (
    <Modal title="窗口期可能只剩五年" onClose={onClose}>
      <div className="z-case-modes" role="group" aria-label="预览案例形式">
        {(Object.keys(caseModes) as Medium[]).map((value) => (
          <button
            type="button"
            key={value}
            aria-pressed={value === medium}
            onClick={() => onChange(value)}
          >
            {mediaLabels[value]}
          </button>
        ))}
        <a
          href={casePreviewUrl(medium)}
          target="_blank"
          rel="noopener noreferrer"
        >
          新窗口打开 <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      </div>
      <iframe
        key={medium}
        className="z-case-frame"
        src={casePreviewUrl(medium)}
        title={`《窗口期可能只剩五年》${mediaLabels[medium]}案例`}
        allow="fullscreen"
        allowFullScreen
      />
    </Modal>
  );
}

export function ArticleCasePreview({ medium }: { medium: Medium }) {
  // Preview state is independent of the questionnaire; closing unmounts players.
  const [preview, setPreview] = useState<Medium | null>(null);
  return (
    <>
      <button
        type="button"
        className="z-article-case"
        onClick={() => setPreview(medium)}
        aria-label={`预览学习案例：窗口期可能只剩五年 · ${mediaLabels[medium]}`}
      >
        <img
          src={`${base}/images/window-cover.jpg`}
          width={1280}
          height={720}
          alt=""
        />
        <span className="z-article-case-copy">
          <span>学习案例</span>
          <strong>窗口期可能只剩五年</strong>
        </span>
        <span className="z-article-case-action">
          <Play size={16} aria-hidden="true" />
          预览{mediaLabels[medium]}
        </span>
      </button>
      {preview && (
        <ArticleCaseDialog
          medium={preview}
          onChange={setPreview}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  );
}
