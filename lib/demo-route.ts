import type { Medium } from "./domain";

export const demoModes = [
  "video",
  "reading",
  "audio",
  "overview",
  "slides",
  "practice",
];
export function demoEntryMode(medium: Medium) {
  return medium === "animation" ? "overview" : medium;
}
export function demoStudyUrl(base: string, mode: string, resume = false) {
  const safeMode = demoModes.includes(mode) ? mode : "video";
  return `${base}/demo/zhihu-window-20260908/?experience=demo&mode=${safeMode}${resume ? "&resume=1" : ""}`;
}
