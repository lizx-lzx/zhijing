const C = {
  bg: "#f5f1e8",
  ink: "#2b2926",
  muted: "#736b61",
  panel: "#fffdf8",
  accent: "#b3402a",
  warm: "#8d301f",
  green: "#8a8174",
};
export function narrativeDiagram(chapter) {
  const groups = [];
  // Landscape flow layouts use independent rows, each containing up to 3 nodes.
  // Preserve those boundaries when reflowing; never invent a cross-row arrow.
  if (chapter.layout === "flow") {
    for (let i = 0; i < chapter.nodes.length; i += 3)
      groups.push(chapter.nodes.slice(i, i + 3));
  } else groups.push(chapter.nodes);
  return {
    layout: chapter.layout,
    kind: chapter.kind,
    subtitle: chapter.subtitle,
    groups,
    note: chapter.visualNote,
  };
}
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
  defaultFontName: id === "title" ? "Songti SC" : "PingFang SC",
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
    text("title", chapter.title, 48, 48, 905, 38, C.ink, 500),
    text("subtitle", chapter.subtitle, 48, 116, 905, 23, C.muted),
  ];
  const box = (node, i, x, y, w, h, size = 28) => {
    e.push(rect(`node-${i}`, x, y, w, h, C.panel));
    e.push(rect(`mark-${i}`, x, y, w, 1.5, "#ded7c9"));
    e.push(
      text(
        `label-${i}`,
        node.title,
        x + 20,
        y + 16,
        w - 40,
        Math.min(size, 25),
        C.ink,
        500,
      ),
    );
    e.push(
      text(`detail-${i}`, node.detail, x + 20, y + 61, w - 40, 20, C.muted),
    );
  };
  const arrow = (id, x, y, value = "→", size = 24) => {
    const vertical = value === "↑" || value === "↓";
    const a = text(
      `arrow-${id}`,
      value,
      vertical ? x : x - 14,
      vertical ? 322 : y,
      38,
      vertical ? 18 : Math.min(size, 24),
      C.muted,
      400,
      "center",
    );
    a.height = vertical ? 24 : 38;
    e.push(a);
  };
  if (chapter.layout === "contrast") {
    chapter.nodes.forEach((n, i) => box(n, i, 50 + i * 465, 215, 390, 211, 25));
    arrow("contrast", 469, 290, "≠", 36);
  } else if (chapter.layout === "flow" || chapter.layout === "cycle") {
    if (chapter.nodes.length === 3) {
      chapter.nodes.forEach((n, i) =>
        box(n, i, 48 + i * 309, 245, 250, 153, 25),
      );
      arrow(0, 322, 287);
      arrow(1, 631, 287);
    } else {
      const cycle = chapter.layout === "cycle";
      chapter.nodes.forEach((n, i) => {
        const col = cycle && i >= 3 ? 5 - i : i % 3;
        box(n, i, 48 + col * 309, 198 + Math.floor(i / 3) * 158, 250, 116, 25);
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
      box(n, i, 49 + i * 309, 285 - i * 40, 250, 155, 25),
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
