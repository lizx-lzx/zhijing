const C = {
  bg: "#121e36",
  ink: "#f3f6ff",
  muted: "#afbdd6",
  panel: "#203253",
  accent: "#9cabff",
  warm: "#f4ba78",
  green: "#7cd6c4",
};
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const text = (
  id,
  value,
  x,
  y,
  w,
  size = 27,
  color = C.ink,
  weight = 400,
  align = "left",
) => ({
  id,
  type: "text",
  left: x,
  top: y,
  width: w,
  height: size * 1.45 * String(value).split("\n").length + 14,
  rotate: 0,
  defaultFontName: "PingFang SC",
  defaultColor: color,
  lineHeight: 1.3,
  content: `<p style="font-size:${size}px;font-weight:${weight};text-align:${align}">${esc(value).replace(/\n/g, "<br>")}</p>`,
});
const rect = (id, x, y, w, h, fill) => ({
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
});

// Semantic relationship layouts. Sizes do not pretend to encode probabilities,
// currency or forecasts; every timeline is explicitly marked as a scenario.
export function narrativeSlide(chapter, index, total, attribution = "") {
  const e = [
    text(
      "eyebrow",
      `${String(index + 1).padStart(2, "0")} / ${total}    ${chapter.kind}${attribution ? ` · ${attribution}` : ""}`,
      48,
      23,
      905,
      22,
      C.warm,
      500,
    ),
    text("title", chapter.title, 46, 67, 910, 42, C.ink, 650),
    text("subtitle", chapter.subtitle, 48, 130, 905, 25, C.muted),
  ];
  const box = (node, i, x, y, w, h, size = 28) => {
    e.push(rect(`node-${i}`, x, y, w, h, C.panel));
    e.push(rect(`mark-${i}`, x, y, 4, h, i % 2 ? C.green : C.accent));
    e.push(
      text(`label-${i}`, node.title, x + 18, y + 15, w - 32, size, C.ink, 600),
    );
    e.push(
      text(`detail-${i}`, node.detail, x + 18, y + 66, w - 32, 23, C.muted),
    );
  };
  const arrow = (id, x, y, value = "→", size = 34) =>
    e.push(text(`arrow-${id}`, value, x, y, 50, size, C.accent, 500, "center"));
  if (chapter.layout === "contrast") {
    chapter.nodes.forEach((n, i) => box(n, i, 50 + i * 465, 215, 420, 211, 35));
    arrow("contrast", 469, 290, "≠", 36);
  } else if (chapter.layout === "flow" || chapter.layout === "cycle") {
    if (chapter.nodes.length === 3) {
      chapter.nodes.forEach((n, i) =>
        box(n, i, 48 + i * 309, 245, 280, 153, 29),
      );
      arrow(0, 322, 287);
      arrow(1, 631, 287);
    } else {
      const cycle = chapter.layout === "cycle";
      chapter.nodes.forEach((n, i) => {
        const col = cycle && i >= 3 ? 5 - i : i % 3;
        box(n, i, 48 + col * 309, 198 + Math.floor(i / 3) * 158, 280, 128, 26);
      });
      arrow(0, 322, 235);
      arrow(1, 631, 235);
      arrow(2, 322, 391, cycle ? "←" : "→");
      arrow(3, 631, 391, cycle ? "←" : "→");
      if (cycle) {
        arrow("down", 785, 318, "↓", 27);
        arrow("up", 155, 318, "↑", 27);
      }
    }
  } else if (chapter.layout === "ladder") {
    chapter.nodes.forEach((n, i) =>
      box(n, i, 49 + i * 309, 285 - i * 40, 280, 155, 30),
    );
    arrow(0, 322, 289, "↗");
    arrow(1, 631, 249, "↗");
  } else if (chapter.layout === "layers") {
    chapter.nodes.forEach((n, i) => {
      const y = 198 + i * 96;
      e.push(rect(`node-${i}`, 55, y, 890, 79, C.panel));
      e.push(text(`label-${i}`, n.title, 74, y + 16, 280, 28, C.accent, 600));
      e.push(text(`detail-${i}`, n.detail, 370, y + 18, 560, 25));
    });
  } else if (chapter.layout === "timeline") {
    e.push(rect("rail", 65, 274, 867, 3, C.accent));
    chapter.nodes.forEach((n, i) => {
      const x = 50 + i * 309;
      e.push(text(`label-${i}`, n.title, x + 6, 212, 280, 37, C.warm, 600));
      e.push(rect(`node-${i}`, x + 20, 264, 19, 22, C.warm));
      e.push(text(`detail-${i}`, n.detail, x + 5, 305, 290, 25));
    });
    e.push(
      text(
        "timeline-boundary",
        "作者设想，不是现实进度条",
        57,
        401,
        890,
        29,
        C.accent,
        600,
      ),
    );
  } else throw new Error(`Unsupported relationship layout: ${chapter.layout}`);
  e.push(text("boundary", chapter.visualNote, 48, 501, 909, 20, C.muted));
  return {
    elements: e,
    background: { type: "solid", color: C.bg },
    remark: chapter.takeaway,
  };
}
