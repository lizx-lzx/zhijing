import {
  BookOpen,
  Headphones,
  MessageCircle,
  MonitorPlay,
  MousePointer2,
  Sparkles,
} from "lucide-react";
import type { Medium } from "../lib/domain";

// Static, labelled presentation examples. These do not play media or classify ability.
export function BookChart() {
  return (
    <svg
      viewBox="0 0 280 118"
      role="img"
      aria-label="示例：五个人读了 2、2、3、3、20 本书，平均 6 本，四个人低于平均数。"
    >
      <path d="M20 88H262" stroke="#bdc8df" />
      {[2, 2, 3, 3, 20].map((value, i) => (
        <g key={i}>
          <rect
            className="z-demo-bar"
            x={32 + i * 46}
            y={88 - value * 3.1}
            width="25"
            height={value * 3.1}
            rx="4"
            fill={i === 4 ? "#f5b548" : "#6574df"}
          />
          <text
            x={44.5 + i * 46}
            y={81 - value * 3.1}
            textAnchor="middle"
            fill="#36415d"
            fontSize="14"
          >
            {value}
          </text>
        </g>
      ))}
      <path d="M20 69.4H262" stroke="#5766c6" strokeDasharray="4 4" />
      <text x="22" y="111" fill="#58657b" fontSize="14">
        5 人的读书量
      </text>
      <text x="260" y="111" textAnchor="end" fill="#5766c6" fontSize="14">
        平均 6 本
      </text>
    </svg>
  );
}

export function MediaPreview({
  medium,
  compact = false,
}: {
  medium: Medium;
  compact?: boolean;
}) {
  const Icon = {
    video: MonitorPlay,
    reading: BookOpen,
    audio: Headphones,
    animation: MousePointer2,
  }[medium];
  return (
    <span
      className={`z-format-preview z-format-${medium}${compact ? " compact" : ""}`}
      aria-hidden="true"
    >
      <span className="z-format-caption">
        <Icon size={18} />
        {medium === "audio" ? "不看屏幕，也能听懂" : "平均数 ≠ 大多数人"}
      </span>
      {medium === "audio" ? (
        <span className="z-waveform">
          {[
            16, 28, 40, 23, 46, 62, 44, 26, 52, 70, 48, 33, 60, 43, 26, 50, 67,
            39, 22, 45, 58, 32, 18,
          ].map((height, i) => (
            <span key={i} style={{ height }} />
          ))}
        </span>
      ) : medium === "animation" ? (
        <span className="z-mini-map">
          <span>看现象</span>
          <span>找原因</span>
          <span>换个角度</span>
        </span>
      ) : (
        <BookChart />
      )}
      <span className="z-format-foot">
        {
          {
            video: "画面 + 讲解 + 字幕",
            reading: "一张图，把关系看清",
            audio: "独立讲稿 · 自己掌握速度",
            animation: "逐章展开 · 随时停下",
          }[medium]
        }
      </span>
    </span>
  );
}

export function EntryPreview({ entry }: { entry: string }) {
  return (
    <span className={`z-entry-preview z-entry-${entry}`} aria-hidden="true">
      {entry === "story" ? (
        <>
          <MessageCircle size={23} />
          <span className="z-story-bubble">
            “我读了 2 本书，
            <br />
            怎么又没到平均水平？”
          </span>
          <span className="z-preview-note">从小林的困惑开始 · 虚构情境</span>
        </>
      ) : entry === "analysis" ? (
        <>
          <strong>平均数 ≠ 大多数人</strong>
          <BookChart />
        </>
      ) : entry === "map" ? (
        <>
          <span className="z-map-root">怎样理解“平均”？</span>
          <span className="z-map-branches">
            <span>数据分布</span>
            <span>极端值</span>
            <span>中位数</span>
          </span>
        </>
      ) : entry === "question" ? (
        <>
          <span className="z-question-mark">?</span>
          <strong>
            为什么 5 个人里，
            <br />4 个都低于平均数？
          </strong>
        </>
      ) : (
        <>
          <Sparkles size={26} />
          <span>看内容，再选讲法</span>
          <span className="z-auto-options">故事 / 结论 / 全貌 / 问题</span>
        </>
      )}
    </span>
  );
}

export function PacePreview({ pace }: { pace: string }) {
  const labels: Record<string, string[]> = {
    compact: ["重点", "结论"],
    balanced: ["重点", "例子", "结论"],
    gentle: ["背景", "第一步", "第二步", "结论"],
  };
  return (
    <span className={`z-pace-preview z-pace-${pace}`} aria-hidden="true">
      {(labels[pace] || labels.balanced).map((label) => (
        <span key={label}>{label}</span>
      ))}
    </span>
  );
}

export function ChoicePreview({
  question,
  value,
}: {
  question: string;
  value: string;
}) {
  if (question === "primary") return <MediaPreview medium={value as Medium} />;
  if (question === "entry") return <EntryPreview entry={value} />;
  if (question === "pace") return <PacePreview pace={value} />;
  return null;
}
