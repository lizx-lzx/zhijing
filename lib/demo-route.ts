import type { Medium } from "./domain";

export const demoModes = [
  "video",
  "reading",
  "audio",
  "overview",
  "slides",
  "practice",
];
export const demoLabels: Record<string, string> = {
  video: "视频",
  slides: "图解",
  audio: "音频",
  reading: "图文",
  overview: "全景图",
  practice: "互动",
};
export function demoEntryMode(medium: Medium) {
  return medium === "animation" ? "overview" : medium;
}
export function demoStudyUrl(base: string, mode: string, resume = false) {
  const safeMode = demoModes.includes(mode) ? mode : "video";
  return `${base}/demo/zhihu-window-20260908/?experience=demo&mode=${safeMode}${resume ? "&resume=1" : ""}`;
}
