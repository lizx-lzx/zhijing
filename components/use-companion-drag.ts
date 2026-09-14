"use client";
import {
  useEffect,
  useRef,
  useState,
  type RefObject,
  type CSSProperties,
  type PointerEvent,
} from "react";
export function useCompanionDrag(
  launcher: RefObject<HTMLButtonElement | null>,
  panel: RefObject<HTMLElement | null>,
  open: boolean,
) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const drag = useRef<{
      id: number;
      x: number;
      y: number;
      left: number;
      top: number;
    } | null>(null),
    moved = useRef(false);
  const clamp = (x: number, y: number) => {
    const r = launcher.current?.getBoundingClientRect();
    return {
      x: Math.max(8, Math.min(x, innerWidth - (r?.width || 130) - 8)),
      y: Math.max(8, Math.min(y, innerHeight - (r?.height || 140) - 8)),
    };
  };
  useEffect(() => {
    const resize = () => setPosition((p) => (p ? clamp(p.x, p.y) : p));
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  useEffect(() => {
    if (!open) return;
    const place = () => {
      const pet = launcher.current?.getBoundingClientRect(),
        box = panel.current?.getBoundingClientRect();
      if (!pet || !box) return;
      const top = pet.top - box.height - 10;
      const y = top >= 8 ? top : pet.bottom + 10;
      setPanelStyle({
        left: Math.max(
          8,
          Math.min(pet.right - box.width, innerWidth - box.width - 8),
        ),
        top: Math.max(8, Math.min(y, innerHeight - box.height - 8)),
        right: "auto",
        bottom: "auto",
      });
    };
    place();
    const observer = new ResizeObserver(place);
    if (panel.current) observer.observe(panel.current);
    window.addEventListener("resize", place);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
    };
  }, [open, position]);
  const handlers = {
    onPointerDown(e: PointerEvent<HTMLButtonElement>) {
      if (!e.isPrimary || e.button !== 0) return;
      const r = e.currentTarget.getBoundingClientRect();
      drag.current = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        left: r.left,
        top: r.top,
      };
      moved.current = false;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove(e: PointerEvent<HTMLButtonElement>) {
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      const dx = e.clientX - d.x,
        dy = e.clientY - d.y;
      if (!moved.current && Math.hypot(dx, dy) < 6) return;
      moved.current = true;
      setPosition(clamp(d.left + dx, d.top + dy));
    },
    onPointerUp(e: PointerEvent<HTMLButtonElement>) {
      if (drag.current?.id !== e.pointerId) return;
      drag.current = null;
      if (e.currentTarget.hasPointerCapture(e.pointerId))
        e.currentTarget.releasePointerCapture(e.pointerId);
    },
    onPointerCancel() {
      drag.current = null;
      moved.current = true;
    },
    onLostPointerCapture() {
      drag.current = null;
    },
  };
  return {
    handlers,
    style: position
      ? ({
          left: position.x,
          top: position.y,
          right: "auto",
          bottom: "auto",
        } as CSSProperties)
      : undefined,
    panelStyle,
    consumeClick: () => {
      const value = moved.current;
      moved.current = false;
      return value;
    },
    moveBy: (x: number, y: number) => {
      const r = launcher.current?.getBoundingClientRect();
      if (r) setPosition(clamp(r.left + x, r.top + y));
    },
  };
}
