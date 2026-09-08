// Page effects are independent of lesson playback and the saved learning Skill.
export function pageMotionEnabled(
  paused: boolean,
  reduced: boolean,
  visible: boolean,
) {
  return !paused && !reduced && visible;
}
