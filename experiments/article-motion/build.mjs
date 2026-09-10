import fs from "node:fs/promises";
import {
  article,
  chapters,
} from "../openmaic-preview/lessons/window-five-years/content.mjs";
const out = new URL(
  "../../public/demo/zhihu-motion-20260910/",
  import.meta.url,
);
const lesson = new URL(
  "../openmaic-preview/lessons/window-five-years/",
  import.meta.url,
);
await fs.mkdir(out, { recursive: true });
for (const file of ["index.html", "motion.js", "style.css"])
  await fs.copyFile(new URL(file, import.meta.url), new URL(file, out));
await fs.copyFile(
  "/Users/li/Documents/gpt/一键网页动画/技术规范/动效引擎.js",
  new URL("engine.js", out),
);
await fs.copyFile(
  "/Users/li/Documents/gpt/一键网页动画/成片/AI智力劳动成本-16比9/animation/gsap.min.js",
  new URL("gsap.min.js", out),
);
await fs.copyFile(
  new URL("public/media/audio.m4a", lesson),
  new URL("audio.m4a", out),
);
await fs.copyFile(
  new URL("public/media/captions.vtt", lesson),
  new URL("captions.vtt", out),
);
const timing = JSON.parse(
  await fs.readFile(new URL("timing.json", lesson), "utf8"),
);
await fs.writeFile(
  new URL("content.json", out),
  JSON.stringify({ article, chapters, timing }),
);
console.log(out.pathname);
