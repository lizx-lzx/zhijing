import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { chromium } from "playwright";
import { config, AppError } from "./config.mjs";
import { playerHTML } from "./player.mjs";

export const mediaDir = (id) => path.join(config.dataDir, "media", id);
async function execute(command, args, timeout = 600000) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let output = "",
      error = "";
    proc.stdout.on("data", (d) => (output += d));
    proc.stderr.on("data", (d) => {
      error = (error + d).slice(-3000);
    });
    const timer = setTimeout(() => proc.kill("SIGKILL"), timeout);
    proc.once("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    proc.once("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(output);
      else reject(new Error(`${command} exited ${code}: ${error.slice(-400)}`));
    });
  });
}
export async function probe(file) {
  const data = JSON.parse(
    await execute(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration:stream=codec_type,codec_name,width,height",
        "-of",
        "json",
        file,
      ],
      30000,
    ),
  );
  if (!Number(data.format?.duration)) throw new Error("Empty media");
  return data;
}
async function voice(text, destination) {
  if (!config.voiceKey || !config.voiceReference)
    throw new AppError(
      "配音服务尚未配置。图文内容已经保存，可稍后重试配音。",
      503,
      "VOICE_UNAVAILABLE",
    );
  const reference = await fs.readFile(config.voiceReference);
  const encoded = `data:audio/${config.voiceReference.endsWith(".wav") ? "wav" : "mpeg"};base64,${reference.toString("base64")}`;
  let response;
  try {
    response = await fetch(`${config.voiceBase}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": config.voiceKey,
      },
      body: JSON.stringify({
        model: config.voiceModel,
        messages: [
          {
            role: "user",
            content:
              "自然、清晰地用普通话讲解知识。语速适中，像认真解释给一个朋友听。不要添加内容。",
          },
          { role: "assistant", content: text },
        ],
        audio: { format: "wav", voice: encoded },
      }),
      signal: AbortSignal.timeout(180000),
    });
  } catch {
    throw new AppError(
      "配音服务暂时未响应，图文已保留，可以重试。",
      502,
      "VOICE_TIMEOUT",
    );
  }
  if (!response.ok)
    throw new AppError(
      "配音服务暂时不可用，图文已保留，可以重试。",
      502,
      "VOICE_ERROR",
    );
  const result = await response.json();
  const data = result.choices?.[0]?.message?.audio?.data;
  if (typeof data !== "string" || data.length < 100)
    throw new Error("Invalid voice response");
  await fs.writeFile(destination, Buffer.from(data, "base64"));
  await probe(destination);
}
const vttTime = (t) => {
  const ms = Math.round(t * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
};
export async function produceMedia(id, lesson, formats, onProgress) {
  const dir = mediaDir(id);
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  const needVoice = formats.some((x) =>
    ["video", "audio", "animation"].includes(x),
  );
  if (!needVoice) return { status: "not-requested" };
  const scenes = [];
  let cursor = 0;
  let vtt = "WEBVTT\n\n";
  for (let i = 0; i < lesson.chapters.length; i++) {
    onProgress(
      `正在配音 · 第 ${i + 1}/${lesson.chapters.length} 章`,
      55 + Math.round((i / lesson.chapters.length) * 22),
    );
    const file = path.join(dir, `voice-${i}.wav`);
    try {
      await probe(file);
    } catch {
      await voice(lesson.chapters[i].narration, file);
    }
    const duration = Number((await probe(file)).format.duration);
    scenes.push({ start: cursor, end: cursor + duration });
    const sentences = lesson.chapters[i].narration.match(
      /[^。！？!?；;]+[。！？!?；;]?/g,
    ) || [lesson.chapters[i].narration];
    const count = sentences.reduce((n, s) => n + s.length, 0);
    let segmentStart = cursor;
    for (const sentence of sentences) {
      const end = segmentStart + (duration * sentence.length) / count;
      vtt += `${vttTime(segmentStart)} --> ${vttTime(end)}\n${sentence.replace(/-->/g, "→")}\n\n`;
      segmentStart = end;
    }
    cursor += duration;
    if (cursor > 900)
      throw new AppError(
        "本次配音超过 15 分钟的制作上限，图文已保留。请缩短原文后再生成。",
        422,
        "MEDIA_TOO_LONG",
      );
  }
  await fs.writeFile(path.join(dir, "captions.vtt"), vtt);
  await fs.writeFile(
    path.join(dir, "audio-list.txt"),
    lesson.chapters.map((_, i) => `file 'voice-${i}.wav'`).join("\n"),
  );
  await execute("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    path.join(dir, "audio-list.txt"),
    "-vn",
    "-ar",
    "24000",
    "-ac",
    "1",
    "-c:a",
    "aac",
    "-b:a",
    "96k",
    path.join(dir, "audio.m4a"),
  ]);
  await probe(path.join(dir, "audio.m4a"));
  await fs.writeFile(path.join(dir, "timeline.json"), JSON.stringify(scenes));
  const html = playerHTML(
    lesson,
    scenes,
    `${config.basePath}/api/lessons/${id}/media/audio.m4a`,
  );
  await fs.writeFile(path.join(dir, "player.html"), html);
  if (formats.includes("video")) {
    onProgress("正在渲染你的讲解视频", 80);
    let reusable = false;
    try {
      const existing = await probe(path.join(dir, "video.mp4"));
      reusable =
        existing.streams.some((s) => s.codec_type === "audio") &&
        existing.streams.some((s) => s.codec_type === "video") &&
        Math.abs(Number(existing.format.duration) - cursor) < 1;
    } catch {
      /* Resume only verified artifacts for this immutable lesson. */
    }
    if (!reusable) await renderVideo(lesson, scenes, dir, onProgress);
  }
  return { status: "ready", duration: cursor, scenes };
}
async function renderVideo(lesson, scenes, dir, onProgress) {
  const browser = await chromium.launch({
    headless: true,
    executablePath: config.chromium,
    args: ["--disable-dev-shm-usage", "--disable-gpu"],
  });
  let ff;
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
    });
    await page.route("**/*", (route) => route.abort());
    await page.setContent(playerHTML(lesson, scenes, "", true), {
      waitUntil: "load",
    });
    await page.evaluate(() => document.fonts.ready);
    const duration = scenes.at(-1).end;
    const fps = 10;
    const frames = Math.ceil(duration * fps);
    const deadline = Date.now() + 1800000;
    ff = spawn(
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
        path.join(dir, "audio.m4a"),
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
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
        path.join(dir, "video.mp4"),
      ],
      { stdio: ["pipe", "ignore", "pipe"] },
    );
    let error = "";
    ff.stderr.on("data", (d) => (error = (error + d).slice(-1200)));
    ff.stdin.on("error", () => {});
    const done = new Promise((resolve, reject) => {
      ff.once("error", reject);
      ff.once("close", (c) =>
        c === 0
          ? resolve()
          : reject(new Error("Video renderer failed: " + error)),
      );
    });
    // Attach rejection immediately; the queue reports a bounded public error.
    done.catch(() => {});
    for (let frame = 0; frame < frames; frame++) {
      if (Date.now() > deadline)
        throw new Error("Video rendering exceeded 30 minutes");
      if (ff.exitCode !== null) throw new Error("Video encoder stopped");
      await page.evaluate((t) => window.seek(t), frame / fps);
      const jpeg = await page.screenshot({
        type: "jpeg",
        quality: 85,
        animations: "disabled",
      });
      if (frame === 0) await fs.writeFile(path.join(dir, "poster.jpg"), jpeg);
      if (!ff.stdin.write(jpeg)) await once(ff.stdin, "drain");
      if (frame % 100 === 0)
        onProgress(
          "正在渲染你的讲解视频",
          80 + Math.floor((frame / frames) * 16),
        );
    }
    ff.stdin.end();
    await done;
    const info = await probe(path.join(dir, "video.mp4"));
    if (
      !info.streams.some((s) => s.codec_type === "audio") ||
      !info.streams.some((s) => s.codec_type === "video") ||
      Math.abs(Number(info.format.duration) - duration) > 1.5
    )
      throw new Error("Video verification failed");
  } finally {
    if (ff && ff.exitCode === null) ff.kill("SIGTERM");
    await browser.close();
  }
}
