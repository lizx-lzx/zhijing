import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "../../node_modules/playwright/index.mjs";
import { config } from "../../server/config.mjs";
import { editionPaths } from "./paths.mjs";
const { root } = editionPaths();
const url = process.env.ZH_PREVIEW_URL || "http://127.0.0.1:4360/";
if (new URL(url).hostname !== "127.0.0.1")
  throw new Error("Export local approved content only");
const timing = JSON.parse(await fs.readFile(new URL("timing.json", root)));
const lesson = JSON.parse(await fs.readFile(new URL("lesson.json", root)));
const dest = new URL("public/diagrams/", root);
await fs.mkdir(dest, { recursive: true });
const browser = await chromium.launch({
  executablePath: config.chromium,
  headless: true,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === new URL(url).origin
      ? route.continue()
      : route.abort(),
  );
  await page.goto(`${url}?capture=1&still=1`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.previewReady);
  await page.evaluate(() => document.fonts.ready);
  for (let i = 0; i < lesson.scenes.length; i++) {
    await page.evaluate(
      (at) => window.renderAt(at),
      timing.segments.find((s) => s.scene === i).start + 0.01,
    );
    await page.screenshot({
      path: fileURLToPath(new URL(`chapter-${i + 1}.png`, dest)),
    });
  }
  if (errors.length) throw new Error(errors.join("; "));
  console.log("DIAGRAMS_READY", lesson.scenes.length);
} finally {
  await browser.close();
}
