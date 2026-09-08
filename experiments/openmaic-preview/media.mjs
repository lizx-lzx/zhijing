import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";
const runtime = process.env.ZH_RUNTIME_ROOT
  ? pathToFileURL(`${process.env.ZH_RUNTIME_ROOT.replace(/\/$/, "")}/`)
  : new URL("../../", import.meta.url);
const { chromium } = await import(
  new URL("node_modules/playwright/index.mjs", runtime)
);
const { config } = await import(new URL("server/config.mjs", runtime));
const { produceMedia, mediaDir, probe } = await import(
  new URL("server/media.mjs", runtime)
);

const lesson = JSON.parse(
  await fs.readFile(new URL("./lesson.json", import.meta.url), "utf8"),
);
const dest = new URL("./public/media/", import.meta.url);
await fs.mkdir(dest, { recursive: true });
const segments = [];
for (let i = 0; i < lesson.scenes.length; i++) {
  let effect = null;
  for (const action of lesson.scenes[i].actions) {
    if (action.type !== "speech")
      effect = { type: action.type, elementId: action.elementId };
    else segments.push({ scene: i, text: action.text, effect });
  }
}
const fingerprint = createHash("sha256")
  .update(JSON.stringify(segments))
  .digest("hex")
  .slice(0, 24);
const id = `openmaic-preview-${fingerprint}`;
const mediaPath = mediaDir(id);
if (process.argv[2] === "voice") {
  // Reuse the existing provider adapter and validated cache, one voice clip per
  // speech action. Visual cues align to actual clip boundaries, not text length.
  const media = await produceMedia(
    id,
    {
      title: lesson.title,
      chapters: segments.map((s, i) => ({
        id: `s${i}`,
        title: lesson.scenes[s.scene].title,
        narration: s.text,
        sourceIds: ["sample"],
        fictional: true,
        visual: { type: "cards", items: [] },
      })),
    },
    ["audio"],
    (stage) => console.log(stage),
  );
  const timing = {
    duration: media.duration,
    fingerprint,
    voiceReady: true,
    segments: segments.map((s, i) => ({ ...s, ...media.scenes[i] })),
  };
  await fs.writeFile(
    new URL("./timing.json", import.meta.url),
    JSON.stringify(timing, null, 2),
  );
  for (const file of ["audio.m4a", "captions.vtt"])
    await fs.copyFile(`${mediaPath}/${file}`, new URL(file, dest));
  console.log("VOICE_READY", media.duration, segments.length);
} else if (process.argv[2] === "video") {
  const timing = JSON.parse(
    await fs.readFile(new URL("./timing.json", import.meta.url), "utf8"),
  );
  if (!timing.voiceReady || timing.fingerprint !== fingerprint)
    throw new Error("Voice and scene actions do not match");
  const url = process.env.ZH_PREVIEW_URL || "http://127.0.0.1:4360/";
  if (new URL(url).hostname !== "127.0.0.1")
    throw new Error("Capture only the local approved sample");
  const browser = await chromium.launch({
    executablePath: config.chromium,
    headless: true,
  });
  let encoder;
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
    });
    await page.route("**/*", (route) => {
      const target = new URL(route.request().url());
      return target.origin === new URL(url).origin
        ? route.continue()
        : route.abort();
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${url}?capture=1`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.previewReady === true);
    await page.evaluate(() => document.fonts.ready);
    const fps = 8,
      count = Math.ceil(timing.duration * fps);
    const output = new URL("video.mp4", dest);
    encoder = spawn(
      "ffmpeg",
      [
        "-y",
        "-v",
        "error",
        "-f",
        "image2pipe",
        "-framerate",
        String(fps),
        "-vcodec",
        "mjpeg",
        "-i",
        "pipe:0",
        "-i",
        fileURLToPath(new URL("audio.m4a", dest)),
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "21",
        "-pix_fmt",
        "yuv420p",
        "-r",
        "24",
        "-c:a",
        "copy",
        "-shortest",
        "-movflags",
        "+faststart",
        "-threads",
        "2",
        decodeURIComponent(output.pathname),
      ],
      { stdio: ["pipe", "ignore", "pipe"] },
    );
    let stderr = "";
    encoder.stderr.on("data", (d) => {
      stderr = (stderr + d).slice(-2000);
    });
    encoder.stdin.on("error", () => {});
    const finished = new Promise((resolve, reject) => {
      encoder.on("error", reject);
      encoder.on("close", (code) =>
        code === 0 ? resolve() : reject(new Error(stderr)),
      );
    });
    finished.catch(() => {});
    const deadline = Date.now() + 15 * 60 * 1000;
    for (let i = 0; i < count; i++) {
      if (Date.now() > deadline) throw new Error("Render deadline exceeded");
      if (encoder.exitCode !== null)
        throw new Error(stderr || "Encoder stopped");
      await page.evaluate((t) => window.renderAt(t), i / fps);
      const frame = await page.screenshot({ type: "jpeg", quality: 88 });
      if (i === 0) await fs.writeFile(new URL("poster.jpg", dest), frame);
      if (!encoder.stdin.write(frame)) await once(encoder.stdin, "drain");
      if (i % 120 === 0)
        console.log(`Rendering ${Math.round((i / count) * 100)}%`);
    }
    encoder.stdin.end();
    await finished;
    if (errors.length) throw new Error(`Renderer errors: ${errors.join("; ")}`);
    const info = await probe(decodeURIComponent(output.pathname));
    if (
      Math.abs(Number(info.format.duration) - timing.duration) > 0.5 ||
      !info.streams.some((s) => s.codec_type === "audio")
    )
      throw new Error("Video/audio validation failed");
    await fs.writeFile(
      new URL("./render/media-proof.json", import.meta.url),
      JSON.stringify(info, null, 2),
    );
    console.log("VIDEO_READY", info.format.duration);
  } finally {
    if (encoder && encoder.exitCode === null) encoder.kill("SIGTERM");
    await browser.close();
  }
} else throw new Error("Use: node media.mjs voice|video");
