// Explicit release acceptance: this creates one real all-format sample and incurs provider usage.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { defaultAnswers } from "../lib/domain.ts";
import { sampleText } from "../server/sample.mjs";
const base = process.env.ZH_ACCEPTANCE_URL;
if (!base || !base.startsWith("https://"))
  throw new Error("Set ZH_ACCEPTANCE_URL to the intended HTTPS /api endpoint");
const origin = new URL(base).origin;
function client() {
  let cookie = "";
  return async (route, method = "GET", body, headers = {}) => {
    const r = await fetch(base + route, {
      method,
      headers: {
        Origin: origin,
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = r.headers.get("set-cookie");
    if (set) {
      assert.match(set, /HttpOnly/);
      assert.match(set, /Secure/);
      assert.match(set, /SameSite=Lax/);
      cookie = set.split(";")[0];
    }
    return r;
  };
}
const a = client(),
  b = client();
const json = async (r) => {
  const data = await r.json();
  assert.ok(r.ok, JSON.stringify(data));
  return data;
};
await json(await a("/me"));
await json(await b("/me"));
const { profile } = await json(
  await a("/profile/design", "POST", {
    answers: {
      ...defaultAnswers,
      primary: "video",
      extras: ["reading", "audio", "animation"],
      entry: "analysis",
    },
  }),
);
assert.equal(profile.engine, "ai");
await json(await a("/profile", "PUT", { profile }));
assert.equal(
  (await b("/profile", "PUT", { profile }, { Origin: "https://evil.example" }))
    .status,
  403,
);
const { source } = await json(
  await a("/sources", "POST", { title: "隔离测试材料", text: sampleText }),
);
const { lesson: job } = await json(
  await a("/lessons", "POST", { sourceId: source.id }),
);
assert.equal((await b("/lessons/" + job.id)).status, 404);
let lesson,
  stage = "";
const start = Date.now();
while (Date.now() - start < 1200000) {
  lesson = (await json(await a("/lessons/" + job.id))).lesson;
  if (lesson.stage !== stage) {
    stage = lesson.stage;
    console.log(stage);
  }
  if (["ready", "partial", "failed"].includes(lesson.status)) break;
  await new Promise((r) => setTimeout(r, 5000));
}
assert.equal(
  lesson.status,
  "ready",
  JSON.stringify({
    status: lesson.status,
    error: lesson.error,
    media: lesson.media,
  }),
);
assert.equal(lesson.formats[0], "video");
assert.equal(lesson.media.status, "ready");
assert.equal(lesson.result.schemaVersion, 2);
assert.equal(lesson.media.audioFile, "listen.m4a");
assert.ok(
  lesson.result.chapters.every((c) => c.audioNarration && c.evidence.length),
);
await json(
  await a(`/lessons/${job.id}/state`, "PUT", {
    mode: "diagrams",
    chapter: 1,
    notes: "公网验收笔记",
  }),
);
assert.equal(
  (await json(await a(`/lessons/${job.id}`))).lesson.studyState.chapter,
  1,
);
const artifacts = [];
for (const file of [
  "video.mp4",
  "audio.m4a",
  "listen.m4a",
  "poster.jpg",
  "captions.vtt",
  "listen.vtt",
]) {
  const media = await a(`/lessons/${job.id}/media/${file}`, "GET", undefined, {
    Range: "bytes=0-511",
  });
  assert.equal(media.status, 206);
  assert.match(media.headers.get("content-range"), /^bytes 0-/);
  assert.ok((await media.arrayBuffer()).byteLength > 0);
  assert.equal((await b(`/lessons/${job.id}/media/${file}`)).status, 404);
  artifacts.push(file);
}
for (const route of ["player", "export.html", "notes.md", "diagram/0"]) {
  const r = await a(`/lessons/${job.id}/${route}`);
  assert.equal(r.status, 200);
  const body = await r.text();
  assert.ok(body.length > 200);
  assert.doesNotMatch(body, /Bearer sk-|ZH_MODEL_KEY|VOICE_AI_API_KEY/);
}
const { code } = await json(await a("/recovery", "POST", {}));
const restored = client();
await json(await restored("/recovery/restore", "POST", { code }));
assert.equal((await restored("/lessons/" + job.id)).status, 200);
const result = {
  at: new Date().toISOString(),
  endpoint: base,
  passed: true,
  id: job.id,
  title: lesson.title,
  duration: lesson.media.duration,
  audioDuration: lesson.media.audioDuration,
  schemaVersion: lesson.result.schemaVersion,
  formats: lesson.formats,
  artifacts,
  checks: [
    "HTTPS private cookies",
    "real Skill design",
    "real all-format generation",
    "source anchors",
    "cross-user isolation",
    "CSRF",
    "byte-range media",
    "offline export",
    "recovery",
  ],
};
await fs.mkdir("test-results", { recursive: true });
await fs.writeFile(
  "test-results/public-smoke.json",
  JSON.stringify(result, null, 2),
);
console.log("PUBLIC_ACCEPTANCE_PASSED", JSON.stringify(result));
