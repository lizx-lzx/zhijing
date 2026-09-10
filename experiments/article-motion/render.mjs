import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
const out = new URL(
  "../../public/demo/zhihu-motion-20260910/",
  import.meta.url,
);
const { timing } = JSON.parse(
  await fs.readFile(new URL("content.json", out), "utf8"),
);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
  page.on("pageerror", (e) => {
    throw e;
  });
  await page.goto("http://127.0.0.1:4367/?capture=1");
  await page.waitForFunction(() => window.__ready);
  await page.evaluate(() => document.fonts.ready);
  const proof = new URL("proof/", out);
  await fs.mkdir(proof, { recursive: true });
  for (const t of [4, 17, 30, 45, 60, 100, 160, 220, 300, 360, 397]) {
    await page.evaluate((t) => window.renderAt(t), t);
    await page.screenshot({ path: fileURLToPath(new URL(`${t}.jpg`, proof)) });
  }
  if (process.argv.includes("--proof")) process.exitCode = 0;
  else {
    const ff = spawn(
      "ffmpeg",
      [
        "-y",
        "-f",
        "image2pipe",
        "-framerate",
        "24",
        "-vcodec",
        "mjpeg",
        "-i",
        "pipe:0",
        "-i",
        fileURLToPath(new URL("audio.m4a", out)),
        "-map",
        "0:v",
        "-map",
        "1:a",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "21",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "copy",
        "-t",
        String(timing.duration),
        "-movflags",
        "+faststart",
        "-threads",
        "2",
        fileURLToPath(new URL("video.pending.mp4", out)),
      ],
      { stdio: ["pipe", "ignore", "pipe"] },
    );
    let errors = "";
    ff.stderr.on("data", (d) => {
      errors = (errors + d).slice(-3000);
    });
    const done = once(ff, "close");
    for (let i = 0; i < Math.ceil(timing.duration * 24); i++) {
      await page.evaluate((t) => window.renderAt(t), i / 24);
      const frame = await page.screenshot({ type: "jpeg", quality: 88 });
      if (!ff.stdin.write(frame)) await once(ff.stdin, "drain");
      if (i % 720 === 0)
        console.log(`rendered ${Math.round(i / 24)} / ${timing.duration}s`);
    }
    ff.stdin.end();
    const [code] = await done;
    if (code) throw new Error(errors);
    await fs.rename(
      new URL("video.pending.mp4", out),
      new URL("video.mp4", out),
    );
  }
  await fs.copyFile(new URL("17.jpg", proof), new URL("poster.jpg", out));
} finally {
  await browser.close();
}
