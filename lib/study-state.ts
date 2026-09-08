import type { StudyState, LessonContent } from "./domain";
export const studyModes = [
  "video",
  "reading",
  "audio",
  "animation",
  "diagrams",
  "overview",
  "practice",
] as const;
export function cleanStudyState(
  input: StudyState,
  result: LessonContent | null,
  media: { duration?: number; audioDuration?: number },
) {
  const patch: StudyState = {};
  const bounded = (v: unknown, max: number) =>
    typeof v === "number" && Number.isFinite(v)
      ? Math.max(0, Math.min(v, max))
      : 0;
  if (studyModes.includes(input.mode!)) patch.mode = input.mode;
  if (Object.hasOwn(input, "chapter"))
    patch.chapter = Math.floor(
      bounded(input.chapter, Math.max(0, (result?.chapters.length || 1) - 1)),
    );
  if (Object.hasOwn(input, "card"))
    patch.card = Math.floor(
      bounded(input.card, Math.max(0, (result?.chapters.length || 1) - 1)),
    );
  if (Object.hasOwn(input, "scenario"))
    patch.scenario = Math.floor(
      bounded(
        input.scenario,
        Math.max(0, (result?.study?.scenarios.length || 1) - 1),
      ),
    );
  if (Object.hasOwn(input, "videoTime"))
    patch.videoTime = bounded(input.videoTime, media.duration || 900);
  if (Object.hasOwn(input, "audioTime"))
    patch.audioTime = bounded(
      input.audioTime,
      media.audioDuration || media.duration || 900,
    );
  if (typeof input.notes === "string") patch.notes = input.notes.slice(0, 8000);
  if (
    input.answers &&
    typeof input.answers === "object" &&
    !Array.isArray(input.answers)
  ) {
    patch.answers = {};
    for (const scenario of result?.study?.scenarios || []) {
      const value = input.answers[scenario.id];
      if (scenario.options.some((o) => o.id === value))
        patch.answers[scenario.id] = value;
    }
    for (const [i, q] of (result?.quiz || []).entries()) {
      const value = input.answers[`quiz-${i}`];
      if (/^\d$/.test(value) && Number(value) < q.options.length)
        patch.answers[`quiz-${i}`] = value;
    }
  }
  return patch;
}
