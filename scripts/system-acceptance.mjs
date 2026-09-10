// Real, provider-backed system acceptance. Creates only private test-owned data.
// State contains a test session: keep outside the repository and web roots.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { defaultAnswers } from "../lib/domain.ts";
import { sampleText } from "../server/sample.mjs";
const base = process.env.ZH_ACCEPTANCE_URL;
const statePath = process.env.ZH_ACCEPTANCE_STATE;
const articlePath = process.env.ZH_ACCEPTANCE_ARTICLE;
if (!base || !statePath || !articlePath)
  throw new Error(
    "Specify endpoint, private state path and supplied article path",
  );
let saved;
try {
  saved = JSON.parse(await fs.readFile(statePath, "utf8"));
} catch {
  saved = { cookie: "", jobs: {}, checks: [] };
}
const persist = () =>
  fs.writeFile(statePath, JSON.stringify(saved), { mode: 0o600 });
async function request(
  route,
  method = "GET",
  body,
  outsider = false,
  extra = {},
) {
  const r = await fetch(base + route, {
    method,
    headers: {
      Origin: process.env.ZH_ACCEPTANCE_ORIGIN || new URL(base).origin,
      ...(!outsider && saved.cookie ? { Cookie: saved.cookie } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...extra,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const cookie = r.headers.get("set-cookie");
  if (!outsider && cookie) {
    saved.cookie = cookie.split(";")[0];
    await persist();
  }
  return r;
}
async function api(route, method = "GET", body) {
  const r = await request(route, method, body);
  const d = await r.json();
  assert.ok(r.ok, JSON.stringify({ route, status: r.status, error: d.error }));
  return d;
}
async function wait(id) {
  const start = Date.now();
  let previous = "";
  while (Date.now() - start < 2400000) {
    const { lesson } = await api(`/lessons/${id}`);
    if (lesson.stage !== previous) {
      console.log(id.slice(0, 8), lesson.stage);
      previous = lesson.stage;
    }
    if (["ready", "partial", "failed"].includes(lesson.status)) {
      assert.equal(
        lesson.status,
        "ready",
        JSON.stringify({
          status: lesson.status,
          error: lesson.error,
          media: lesson.media,
        }),
      );
      return lesson;
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(
    "Timed out; private task and checkpoint retained for resuming",
  );
}
await api("/me");
const definitions = [
  { key: "article-analysis", entry: "analysis", full: true },
  { key: "article-story", entry: "story", full: false },
  { key: "sample-map", entry: "map", full: false },
];
const report = [];
for (const def of definitions) {
  if (!saved.jobs[def.key]) {
    const { profile } = await api("/profile/design", "POST", {
      answers: {
        ...defaultAnswers,
        primary: def.key.startsWith("article") ? "video" : "reading",
        extras: [],
        entry: def.entry,
        pace: "balanced",
      },
    });
    assert.equal(profile.engine, "ai");
    await api("/profile", "PUT", { profile });
    const { source } = def.key.startsWith("article")
      ? await api("/sources", "POST", {
          title: "窗口期可能只剩五年",
          text: await fs.readFile(articlePath, "utf8"),
        })
      : await api("/sources", "POST", {
          title: "隔离测试材料",
          text: sampleText,
        });
    const { lesson } = await api("/lessons", "POST", {
      sourceId: source.id,
      formats: def.full
        ? ["video", "reading", "audio", "animation"]
        : ["reading"],
    });
    saved.jobs[def.key] = lesson.id;
    await persist();
  }
  const lesson = await wait(saved.jobs[def.key]);
  const r = lesson.result;
  assert.equal(r.schemaVersion, 2);
  assert.ok(r.study.overview.groups.length);
  const mapped = r.study.overview.groups.flatMap((g) => g.chapterIds);
  assert.deepEqual([...mapped].sort(), r.chapters.map((c) => c.id).sort());
  assert.ok(
    r.chapters.every(
      (c) =>
        c.evidence.length &&
        c.audioNarration !== c.narration &&
        c.takeaway &&
        c.premise &&
        c.recallQuestion,
    ),
  );
  assert.equal(
    r.chapters[0].kind,
    { analysis: "结论", story: "故事", map: "全貌" }[def.entry],
  );
  const profileBefore = JSON.stringify((await api("/me")).profile);
  const state = {
    mode: "reading",
    chapter: 2,
    videoTime: 17,
    audioTime: 23,
    notes: "验收笔记：这是我的理解，不自动修改学习 Skill。",
    card: 1,
  };
  await api(`/lessons/${lesson.id}/state`, "PUT", state);
  const restored = (await api(`/lessons/${lesson.id}`)).lesson;
  for (const [k, v] of Object.entries(state))
    assert.equal(restored.studyState[k], v);
  assert.equal(JSON.stringify((await api("/me")).profile), profileBefore);
  assert.equal(
    (await request(`/lessons/${lesson.id}/state`, "PUT", state, true)).status,
    404,
  );
  assert.equal(
    (
      await request(
        `/lessons/${lesson.id}/formats`,
        "POST",
        { formats: ["audio"] },
        true,
      )
    ).status,
    404,
  );
  for (const endpoint of [
    "export.json",
    "export.html",
    "notes.md",
    "player",
    "diagram/0",
  ]) {
    const response = await request(`/lessons/${lesson.id}/${endpoint}`);
    assert.equal(response.status, 200);
    const body = await response.text();
    assert.ok(body.length > 200);
    if (["export.html", "notes.md"].includes(endpoint)) {
      assert.ok(body.includes("验收笔记"));
      assert.ok(body.includes("复习卡"));
      assert.ok(body.includes("听读"));
    }
    assert.equal(
      (
        await request(
          `/lessons/${lesson.id}/${endpoint}`,
          "GET",
          undefined,
          true,
        )
      ).status,
      404,
    );
  }
  const mediaChecks = [];
  if (def.full) {
    assert.equal(lesson.media.videoReady, true);
    assert.equal(lesson.media.audioReady, true);
    assert.equal(lesson.media.audioFile, "listen.m4a");
    for (const name of [
      "video.mp4",
      "audio.m4a",
      "listen.m4a",
      "captions.vtt",
      "listen.vtt",
      "poster.jpg",
    ]) {
      const res = await request(
        `/lessons/${lesson.id}/media/${name}`,
        "GET",
        undefined,
        false,
        { Range: "bytes=0-511" },
      );
      assert.equal(res.status, 206);
      assert.ok((await res.arrayBuffer()).byteLength > 0);
      const whole = await request(`/lessons/${lesson.id}/media/${name}`);
      const bytes = Buffer.from(await whole.arrayBuffer());
      mediaChecks.push({
        name,
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      });
    }
    assert.notEqual(
      mediaChecks.find((m) => m.name === "audio.m4a").sha256,
      mediaChecks.find((m) => m.name === "listen.m4a").sha256,
    );
    assert.equal(
      (
        await api(`/lessons/${lesson.id}/formats`, "POST", {
          formats: ["video", "audio"],
        })
      ).alreadyReady,
      true,
    );
  }
  report.push({
    key: def.key,
    id: lesson.id,
    title: r.title,
    chapters: r.chapters.length,
    firstChapter: r.chapters[0].title,
    overviewGroups: r.study.overview.groups.length,
    scenarios: r.study.scenarios.length,
    glossary: r.study.glossary.length,
    videoDuration: lesson.media.duration,
    audioDuration: lesson.media.audioDuration,
    media: mediaChecks,
  });
  console.log("VERIFIED", def.key, r.chapters.length, "chapters");
}
assert.notEqual(report[0].firstChapter, report[1].firstChapter);
const library = await api("/lessons");
assert.ok(library.total >= definitions.length);
const supplementId = saved.jobs["sample-map"];
const beforeSupplement = (await api(`/lessons/${supplementId}`)).lesson;
const coreHash = createHash("sha256")
  .update(JSON.stringify(beforeSupplement.result))
  .digest("hex");
if (!beforeSupplement.media.audioReady)
  await api(`/lessons/${supplementId}/formats`, "POST", { formats: ["audio"] });
const supplemented = await wait(supplementId);
assert.equal(supplemented.media.audioReady, true);
assert.equal(
  createHash("sha256")
    .update(JSON.stringify(supplemented.result))
    .digest("hex"),
  coreHash,
);
assert.equal(supplemented.studyState.notes, beforeSupplement.studyState.notes);
console.log(
  "SUPPLEMENT_VERIFIED",
  supplemented.id,
  supplemented.media.audioDuration,
);
const { code } = await api("/recovery", "POST", {});
saved.cookie = "";
await api("/recovery/restore", "POST", { code });
assert.equal(
  (
    await api(`/lessons/${saved.jobs[definitions[0].key]}`)
  ).lesson.studyState.notes.includes("验收笔记"),
  true,
);
const output = {
  at: new Date().toISOString(),
  endpoint: base,
  passed: true,
  supplementalGeneration: {
    id: supplementId,
    preservedCore: true,
    preservedNotes: true,
    audioDuration: supplemented.media.audioDuration,
  },
  checks: [
    "real questionnaire Skill",
    "same article different entries",
    "complete study schema",
    "independent listening",
    "private progress and notes",
    "unchanged personal Skill",
    "exports",
    "cross-account isolation",
    "media byte ranges",
    "idempotent supplemental generation",
    "search library",
    "account recovery",
  ],
  runs: report,
};
await fs.writeFile(
  process.env.ZH_ACCEPTANCE_REPORT || "test-results/system-acceptance.json",
  JSON.stringify(output, null, 2),
);
console.log("SYSTEM_ACCEPTANCE_PASSED", JSON.stringify(output));
