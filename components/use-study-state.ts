"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { StudyState } from "../lib/domain";
import { endpoint } from "./learning-ui";

export function useStudyState(id: string, initial: StudyState = {}) {
  const [state, setState] = useState<StudyState>(initial);
  const [saved, setSaved] = useState("已保存");
  const latest = useRef(initial),
    dirty = useRef(false),
    serial = useRef(Promise.resolve());
  const flush = useCallback(() => {
    if (!dirty.current) return;
    const snapshot = latest.current;
    dirty.current = false;
    serial.current = serial.current
      .catch(() => {})
      .then(async () => {
        const response = await fetch(endpoint(`/lessons/${id}/state`), {
          method: "PUT",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(snapshot),
          keepalive: true,
        });
        if (!response.ok) throw new Error("save failed");
        if (snapshot === latest.current) setSaved("已保存");
      })
      .catch(() => {
        dirty.current = true;
        setSaved("暂未保存，连接恢复后重试");
      });
  }, [id]);
  const patch = useCallback((value: Partial<StudyState>) => {
    latest.current = { ...latest.current, ...value };
    dirty.current = true;
    setState(latest.current);
    setSaved("正在保存…");
  }, []);
  useEffect(() => {
    const timer = setTimeout(flush, 900);
    return () => clearTimeout(timer);
  }, [state, flush]);
  useEffect(() => {
    const visibility = () => {
      if (document.hidden) flush();
    };
    const timer = setInterval(flush, 15000);
    window.addEventListener("online", flush);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clearInterval(timer);
      flush();
      window.removeEventListener("online", flush);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [flush]);
  return { state, patch, saved, flush };
}
