import test from "node:test";
import assert from "node:assert/strict";
import {
  demoModes,
  demoStudyUrl,
  updateDemoSelection,
} from "../lib/demo-route.ts";

const videoOnly = { primary: "video", modes: ["video"] };

test("uncheck the default video and select another mode without using the primary selector", () => {
  const empty = updateDemoSelection(videoOnly, {
    type: "toggle",
    mode: "video",
    checked: false,
  });
  assert.deepEqual(empty, { primary: "", modes: [] });
  const next = updateDemoSelection(empty, {
    type: "toggle",
    mode: "reading",
    checked: true,
  });
  assert.deepEqual(next, { primary: "reading", modes: ["reading"] });
  assert.match(demoStudyUrl("/zhijing", next.primary), /mode=reading/);
  assert.deepEqual(videoOnly, { primary: "video", modes: ["video"] });
});

test("removing the primary chooses a remaining checked form", () => {
  assert.deepEqual(
    updateDemoSelection(
      { primary: "video", modes: ["video", "audio", "reading"] },
      { type: "toggle", mode: "video", checked: false },
    ),
    { primary: "audio", modes: ["audio", "reading"] },
  );
});

test("changing a sole primary replaces it; multi-selection keeps deliberate extra forms", () => {
  assert.deepEqual(
    updateDemoSelection(videoOnly, { type: "primary", mode: "slides" }),
    { primary: "slides", modes: ["slides"] },
  );
  assert.deepEqual(
    updateDemoSelection(
      { primary: "video", modes: ["video", "audio"] },
      { type: "primary", mode: "reading" },
    ),
    { primary: "reading", modes: ["video", "audio", "reading"] },
  );
});

test("select-all and clear-all update both controls", () => {
  const all = updateDemoSelection(
    { primary: "audio", modes: ["audio"] },
    { type: "all", checked: true },
  );
  assert.equal(all.primary, "audio");
  assert.deepEqual(all.modes, demoModes);
  assert.deepEqual(updateDemoSelection(all, { type: "all", checked: false }), {
    primary: "",
    modes: [],
  });
});

test("all 64 subsets preserve the primary/checklist invariant through every action", () => {
  for (let mask = 0; mask < 64; mask++) {
    const modes = demoModes.filter((_, i) => mask & (1 << i));
    for (const primary of modes.length ? modes : [""]) {
      const initial = { primary, modes };
      for (const mode of demoModes) {
        for (const action of [
          { type: "primary", mode },
          { type: "toggle", mode, checked: true },
          { type: "toggle", mode, checked: false },
          { type: "all", checked: true },
          { type: "all", checked: false },
        ]) {
          const next = updateDemoSelection(initial, action);
          assert.equal(new Set(next.modes).size, next.modes.length);
          assert.ok(
            next.modes.length
              ? next.modes.includes(next.primary)
              : next.primary === "",
          );
        }
      }
    }
  }
});
