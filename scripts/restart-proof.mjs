// Explicit acceptance-only restart evidence, not a production data migration.
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
const [mode, directory, checkpoint] = process.argv.slice(2);
if (
  !directory?.endsWith("zhijing-system-v2-acceptance") ||
  !["capture", "verify"].includes(mode)
)
  throw new Error("Requires the isolated system acceptance directory");
const state = JSON.parse(
  await fs.readFile(path.join(directory, "run.json"), "utf8"),
);
const id = state.jobs["article-analysis"];
const db = new DatabaseSync(path.join(directory, "data/zhijing.sqlite"), {
  readOnly: true,
});
const row = db.prepare("SELECT * FROM lessons WHERE id=?").get(id);
const hash = (input) => createHash("sha256").update(input).digest("hex");
const mediaDir = path.join(directory, "data/media", id);
if (mode === "capture") {
  assert.equal(JSON.parse(row.result).schemaVersion, 2);
  const voiceFiles = (await fs.readdir(mediaDir)).filter((f) =>
    /^voice-[0-3]\.wav$/.test(f),
  );
  assert.equal(voiceFiles.length, 4);
  const proof = {
    id,
    result: hash(row.result),
    analysis: hash(row.analysis),
    files: await Promise.all(
      voiceFiles.map(async (name) => ({
        name,
        hash: hash(await fs.readFile(path.join(mediaDir, name))),
      })),
    ),
  };
  await fs.writeFile(checkpoint, JSON.stringify(proof), { mode: 0o600 });
  console.log("RESTART_CAPTURED", id, row.status, "four completed voice files");
} else {
  const proof = JSON.parse(await fs.readFile(checkpoint, "utf8"));
  assert.equal(id, proof.id);
  assert.equal(hash(row.result), proof.result);
  assert.equal(hash(row.analysis), proof.analysis);
  for (const f of proof.files)
    assert.equal(hash(await fs.readFile(path.join(mediaDir, f.name))), f.hash);
  assert.ok(["working", "ready"].includes(row.status));
  assert.ok(row.attempts >= 2);
  console.log(
    "RESTART_VERIFIED",
    id,
    row.status,
    "content, source analysis and verified voice files unchanged",
  );
}
db.close();
