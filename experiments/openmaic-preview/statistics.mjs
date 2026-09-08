// Numerical positions are computed by the host, not guessed by a language model.
// These builders emit the same public Slide DSL consumed by OpenMAIC's renderer.
const C = {
  ink: "#18253d",
  muted: "#63728b",
  purple: "#555bd6",
  green: "#139d8c",
  orange: "#dc663b",
  line: "#d7dfeb",
};
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const fmt = (n) => String(Math.round(n * 100) / 100);
export function statistics(values) {
  if (
    !Array.isArray(values) ||
    values.length < 3 ||
    values.length > 8 ||
    values.some((v) => !Number.isFinite(v) || v < 0)
  )
    throw new Error("This plot accepts 3–8 nonnegative finite observations");
  const sorted = [...values].sort((a, b) => a - b);
  const total = values.reduce((a, b) => a + b, 0);
  const middle = Math.floor(values.length / 2);
  return {
    total,
    mean: total / values.length,
    median:
      values.length % 2
        ? sorted[middle]
        : (sorted[middle - 1] + sorted[middle]) / 2,
    sorted,
  };
}
const text = (
  id,
  value,
  x,
  y,
  w,
  size = 26,
  color = C.ink,
  weight = 400,
  align = "left",
) => ({
  id,
  type: "text",
  left: x,
  top: y,
  width: w,
  height: size * 1.45 + 20,
  rotate: 0,
  defaultFontName: "PingFang SC",
  defaultColor: color,
  lineHeight: 1.3,
  content: `<p style="font-size:${size}px;font-weight:${weight};text-align:${align}">${esc(value)}</p>`,
});
const rect = (id, x, y, w, h, fill, extra = {}) => ({
  id,
  type: "shape",
  left: x,
  top: y,
  width: w,
  height: h,
  rotate: 0,
  viewBox: [200, 200],
  path: "M 0 0 L 200 0 L 200 200 L 0 200 Z",
  fill,
  fixedRatio: false,
  ...extra,
});
export function statisticalSlide({ view, title, subtitle }, dataset) {
  const { values, unit, labels } = dataset;
  const stats = statistics(values);
  const e = [
    text("title", title, 45, 25, 900, 39, C.ink, 650),
    text("subtitle", subtitle, 48, 92, 895, 25, C.muted),
  ];
  if (view === "distribution") {
    const max = Math.ceil(Math.max(...values) / 5) * 5 || 5;
    const x = 200,
      width = 650,
      top = 177,
      row = 52,
      scale = width / max;
    for (let tick = 0; tick <= max; tick += max / 5) {
      const px = x + tick * scale;
      e.push(
        rect(
          `grid-${tick}`,
          px,
          top - 7,
          1,
          row * (values.length - 1) + 42,
          C.line,
        ),
      );
      e.push(
        text(
          `tick-${tick}`,
          fmt(tick),
          px - 24,
          top + row * (values.length - 1) + 36,
          50,
          21,
          C.muted,
          400,
          "center",
        ),
      );
    }
    values.forEach((v, i) => {
      const y = top + i * row;
      e.push(
        text(`label-${i}`, labels?.[i] || `读者 ${i + 1}`, 55, y - 12, 130, 25),
      );
      e.push(
        rect(
          `bar-${i}`,
          x,
          y,
          v * scale,
          30,
          v === Math.max(...values) ? C.orange : C.purple,
          { dataValue: v, dataScale: scale },
        ),
      );
      e.push(
        text(
          `value-${i}`,
          fmt(v),
          x + v * scale + 4,
          y - 12,
          70,
          25,
          C.ink,
          600,
        ),
      );
    });
    const meanX = x + stats.mean * scale;
    for (let y = top - 6; y < top + row * values.length - 8; y += 16)
      e.push(rect(`mean-dash-${y}`, meanX, y, 2, 8, C.green));
    e.push(
      text(
        "mean-label",
        `平均 ${fmt(stats.mean)} ${unit}`,
        meanX - 36,
        130,
        230,
        23,
        C.green,
        600,
      ),
    );
    e.push(text("unit", `阅读量 / ${unit}`, 768, 472, 180, 22, C.muted));
  } else if (view === "pool") {
    const max = Math.ceil(Math.max(...values) / 5) * 5 || 5;
    const scale = 230 / max,
      baseline = 414;
    e.push(
      text("original-label", "每个人实际读到的", 50, 130, 360, 24, C.muted),
    );
    e.push(
      text("shared-label", "把总量平均分给每个人", 540, 130, 405, 24, C.muted),
    );
    for (const [side, left] of [
      ["before", 85],
      ["after", 560],
    ]) {
      e.push(rect(`${side}-baseline`, left - 20, baseline, 335, 2, C.line));
      values.forEach((v, i) => {
        const value = side === "before" ? v : stats.mean;
        const height = value * scale,
          x = left + i * 62;
        e.push(
          rect(
            `${side}-bar-${i}`,
            x,
            baseline - height,
            37,
            height,
            side === "after"
              ? C.green
              : v === Math.max(...values)
                ? C.orange
                : C.purple,
            { dataValue: value, dataScale: scale },
          ),
        );
        e.push(
          text(
            `${side}-value-${i}`,
            fmt(value),
            x - 12,
            baseline - height - 45,
            64,
            24,
            C.ink,
            600,
            "center",
          ),
        );
      });
    }
    e.push(text("arrow", "→", 435, 270, 75, 46, C.muted, 400, "center"));
    e.push(
      text(
        "formula",
        `${fmt(stats.total)} ${unit} ÷ ${values.length} 人 = ${fmt(stats.mean)} ${unit} / 人`,
        165,
        457,
        650,
        32,
        C.green,
        600,
        "center",
      ),
    );
    e.push(
      text("unit", `柱高同一比例 · 单位：${unit}`, 58, 182, 355, 20, C.muted),
    );
  } else if (view === "rank") {
    const n = values.length,
      gap = 820 / n,
      middle = Math.floor(n / 2);
    e.push(
      text("rank-label", "按大小排序，找中间位置", 55, 143, 870, 28, C.muted),
    );
    stats.sorted.forEach((v, i) => {
      const active = i === middle || (n % 2 === 0 && i === middle - 1);
      const x = 80 + gap * i;
      e.push(
        rect(
          `position-${i}`,
          x,
          225,
          gap - 22,
          132,
          active ? "#e0f3ed" : "#e9edf6",
        ),
      );
      e.push(
        text(
          `rank-number-${i}`,
          fmt(v),
          x + 5,
          238,
          gap - 32,
          49,
          active ? C.green : C.ink,
          600,
          "center",
        ),
      );
      e.push(
        text(
          `rank-order-${i}`,
          `第 ${i + 1} 位`,
          x - 3,
          359,
          gap - 16,
          24,
          C.muted,
          400,
          "center",
        ),
      );
    });
    e.push(
      text(
        "median-label",
        `中位数 = ${fmt(stats.median)} ${unit}`,
        240,
        429,
        520,
        32,
        C.green,
        600,
        "center",
      ),
    );
    e.push(
      text(
        "rank-note",
        "格子表示排序位置，不是数值距离",
        215,
        482,
        580,
        22,
        C.muted,
        400,
        "center",
      ),
    );
  } else if (view === "summary") {
    const rows = [
      ["一共读了多少？", "总量", stats.total],
      ["平均每人分到多少？", "平均数", stats.mean],
      ["排序后中间是多少？", "中位数", stats.median],
    ];
    rows.forEach(([question, label, value], i) => {
      const y = 166 + i * 86;
      e.push(
        rect(`row-${i}`, 60, y, 880, 74, i % 2 === 0 ? "#edf1f7" : "#f8fafc"),
      );
      e.push(text(`question-${i}`, question, 78, y + 7, 410, 27));
      e.push(text(`metric-${i}`, label, 520, y + 8, 170, 26, C.muted));
      e.push(
        text(
          `answer-${i}`,
          `${fmt(value)} ${unit}`,
          705,
          y - 1,
          200,
          38,
          i === 1 ? C.purple : C.green,
          600,
        ),
      );
    });
    e.push(
      text(
        "boundary",
        "看典型水平，还要结合完整分布。",
        74,
        440,
        860,
        28,
        C.ink,
        600,
      ),
    );
    e.push(
      text(
        "context",
        "读了几本，也不等于学习质量。",
        74,
        482,
        860,
        23,
        C.muted,
      ),
    );
  } else throw new Error(`Unsupported statistical view ${view}`);
  e.push(
    text("fiction", "虚构读书组数据", 744, 510, 225, 18, C.muted, 400, "right"),
  );
  return {
    elements: e,
    background: { type: "solid", color: "#f8fafc" },
    remark: `图形由知径按数据计算；视图=${view}；总量=${stats.total}，均值=${stats.mean}，中位数=${stats.median}。`,
  };
}
