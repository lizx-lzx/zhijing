"use client";
import { useEffect } from "react";

// Recording shortcut: open question one without clearing the saved profile or works.
export function useExperienceShortcut(basePath: string) {
  useEffect(() => {
    const restart = (event: KeyboardEvent) => {
      if (
        event.code !== "KeyR" ||
        !event.altKey ||
        !event.shiftKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.repeat ||
        event.isComposing
      )
        return;
      event.preventDefault();
      const questionnaire = `${basePath}/?start=questionnaire`;
      // A focused same-origin case preview should restart the whole site, not its iframe.
      let destination: Window = window;
      try {
        if (window.top?.location.origin === window.location.origin)
          destination = window.top;
      } catch {
        // When embedded by another origin, only navigate our own frame.
      }
      destination.location.assign(questionnaire);
    };
    window.addEventListener("keydown", restart, true);
    return () => window.removeEventListener("keydown", restart, true);
  }, [basePath]);
}
