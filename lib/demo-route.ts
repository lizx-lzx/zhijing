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

export type DemoSelection = { primary: string; modes: string[] };
export type DemoSelectionAction =
  | { type: "primary"; mode: string }
  | { type: "toggle"; mode: string; checked: boolean }
  | { type: "all"; checked: boolean };

// A single state keeps the entry mode and checklist in agreement, including
// the temporary empty state while the user changes their selection.
export function updateDemoSelection(
  state: DemoSelection,
  action: DemoSelectionAction,
): DemoSelection {
  if (action.type === "all") {
    return action.checked
      ? { primary: state.primary || demoModes[0], modes: [...demoModes] }
      : { primary: "", modes: [] };
  }
  if (!demoModes.includes(action.mode)) return state;
  if (action.type === "primary") {
    return {
      primary: action.mode,
      modes:
        state.modes.length <= 1
          ? [action.mode]
          : [...new Set([...state.modes, action.mode])],
    };
  }
  const modes = action.checked
    ? [...new Set([...state.modes, action.mode])]
    : state.modes.filter((mode) => mode !== action.mode);
  return {
    primary: modes.includes(state.primary) ? state.primary : modes[0] || "",
    modes,
  };
}

export function demoStudyUrl(base: string, mode: string, resume = false) {
  const safeMode = demoModes.includes(mode) ? mode : "video";
  return `${base}/demo/zhihu-window-20260908/?experience=demo&mode=${safeMode}${resume ? "&resume=1" : ""}`;
}
