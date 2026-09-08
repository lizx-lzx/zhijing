import fs from "node:fs/promises";
const lesson = JSON.parse(
  await fs.readFile(new URL("./lesson.json", import.meta.url), "utf8"),
);
let cursor = 0;
const segments = [];
lesson.scenes.forEach((scene, i) => {
  let effect = null;
  for (const action of scene.actions) {
    if (action.type !== "speech")
      effect = { type: action.type, elementId: action.elementId };
    else {
      const start = cursor;
      cursor += Math.max(4, action.text.length / 5);
      segments.push({
        scene: i,
        text: action.text,
        effect,
        start,
        end: cursor,
      });
    }
  }
});
await fs.writeFile(
  new URL("./timing.json", import.meta.url),
  JSON.stringify(
    {
      voiceReady: false,
      duration: cursor,
      segments,
      note: "Temporary silent slide navigation only. Must be replaced by measured clip timings before video capture or publication.",
    },
    null,
    2,
  ),
);
