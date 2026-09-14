import { useEffect, useRef, useState } from "react";

export const studyNudges = [
  { id: "sources", text: "要找更多来源吗？", enabled: false },
  { id: "original", text: "要看看原文吗？", enabled: true },
  { id: "explain", text: "一起捋一捋吧？", enabled: true },
] as const;

export function useStudyNudge(chapter: string | undefined, open: boolean) {
  const [nudge, setNudge] = useState<string | null>(null);
  const cooldown = useRef(0);
  const sequence = useRef(0);
  useEffect(() => {
    setNudge(null);
    if (!chapter || open) return;
    let elapsed = 0;
    let shown = 0;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const delta = Math.min(now - last, 1000);
      last = now;
      const playing = [...document.querySelectorAll("video,audio")].some(
        (node) =>
          !(node as HTMLMediaElement).paused &&
          !(node as HTMLMediaElement).ended,
      );
      if (
        document.hidden ||
        playing ||
        document.querySelector("dialog[open]")
      ) {
        setNudge(null);
        shown = 0;
        elapsed = 0;
        return;
      }
      if (shown) {
        if (now - shown >= 8000) {
          setNudge(null);
          shown = 0;
        }
        return;
      }
      if (now < cooldown.current) return;
      elapsed += delta;
      if (elapsed >= 90000) {
        const options = studyNudges.filter((item) => item.enabled);
        setNudge(options[sequence.current++ % options.length].id);
        shown = now;
        elapsed = 0;
        cooldown.current = now + 300000;
      }
    }, 500);
    return () => clearInterval(timer);
  }, [chapter, open]);
  return {
    nudge,
    dismiss: () => {
      setNudge(null);
      cooldown.current = performance.now() + 300000;
    },
  };
}
