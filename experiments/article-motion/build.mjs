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
  new URL("vendor/engine.js", import.meta.url),
  new URL("engine.js", out),
);
await fs.copyFile(
  new URL("vendor/gsap.min.js", import.meta.url),
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
// Frozen media from the reviewed article, not newly generated results.
for (const file of ["video.mp4", "poster.jpg"])
  await fs.copyFile(
    new URL(`assets/${file}`, import.meta.url),
    new URL(file, out),
  );
const timing = JSON.parse(
  await fs.readFile(new URL("timing.json", lesson), "utf8"),
);
await fs.writeFile(
  new URL("content.json", out),
  JSON.stringify({ article, chapters, timing }),
);
console.log(out.pathname);
