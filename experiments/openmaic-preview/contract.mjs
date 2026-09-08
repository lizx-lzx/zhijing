export function validateSlide(slide) {
  if (!slide?.elements?.length) throw new Error("Missing slide");
  const ids = new Set();
  for (const element of slide.elements) {
    if (!["text", "shape", "line"].includes(element.type))
      throw new Error(`Unsupported element ${element.type}`);
    if (ids.has(element.id)) throw new Error("Duplicate element ID");
    ids.add(element.id);
    const serialized = JSON.stringify(element);
    if (
      /<\s*(script|iframe|object|embed|img|svg|a)\b|\bon\w+\s*=|javascript:|url\s*\(|https?:\/\//i.test(
        serialized,
      )
    )
      throw new Error(
        "External or executable content is not allowed in this preview",
      );
    if (!Number.isFinite(element.left) || !Number.isFinite(element.top))
      throw new Error("Invalid geometry");
    if (
      element.left < -1 ||
      element.top < -1 ||
      element.left + element.width > 1002 ||
      element.top + element.height > 564
    )
      throw new Error(
        `Element outside 1000x562.5 canvas: ${element.id}, x=${element.left}, y=${element.top}, w=${element.width}, h=${element.height}`,
      );
  }
  return ids;
}

export function validateScene(scene) {
  if (scene?.type !== "slide") throw new Error("Expected slide");
  const ids = validateSlide(scene.content?.canvas);
  let speeches = 0;
  for (const action of scene.actions) {
    if (!["speech", "spotlight", "laser", "highlight"].includes(action.type))
      throw new Error(`Unsupported action ${action.type}`);
    if (action.type === "speech") {
      if (!action.text?.trim()) throw new Error("Empty speech");
      speeches++;
    } else if (!ids.has(action.elementId))
      throw new Error("Action targets a missing element");
  }
  if (speeches < 2)
    throw new Error("A narrated scene must have at least two speech segments");
  return scene;
}

export function locateSegment(timeline, time) {
  if (!timeline.length) return null;
  // Media clocks round decimal seconds; a seek to 42.72 must match a
  // generated boundary of 42.720000000000006 instead of the previous page.
  const alignedTime = time + 0.000001;
  return (
    timeline.find((s) => alignedTime >= s.start && alignedTime < s.end) ||
    (time < 0 ? timeline[0] : timeline.at(-1))
  );
}

export function captionAt(segment, time) {
  const chunks = segment.text.match(/[^。！？；，,]{1,36}[。！？；，,]?/gu) || [
    segment.text,
  ];
  const fraction = Math.max(
    0,
    Math.min(0.999, (time - segment.start) / (segment.end - segment.start)),
  );
  const count = chunks.reduce((n, text) => n + text.length, 0);
  let cursor = 0;
  for (const chunk of chunks) {
    cursor += chunk.length;
    if (fraction < cursor / count) return chunk;
  }
  return chunks.at(-1);
}
