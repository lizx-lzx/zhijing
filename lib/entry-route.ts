// Entry navigation changes only the visible screen, never the saved visitor/profile.
export function entryRoute(hasProfile: boolean, search: string) {
  const params = new URLSearchParams(search);
  if (["questionnaire", "preferences"].includes(params.get("start") || ""))
    return { view: "questionnaire", lesson: null };
  const welcome = params.get("start") === "welcome" || !hasProfile;
  const lesson = params.get("lesson");
  return {
    view: welcome ? "welcome" : "workspace",
    lesson: !welcome && lesson && /^[a-f0-9]{32}$/.test(lesson) ? lesson : null,
  };
}
