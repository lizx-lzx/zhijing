"use client";
import { useEffect, useRef, useState } from "react";
import { base } from "./learning-ui";
type VM = {
  viewModel(name: string): VM | null;
  trigger(name: string): { trigger(): void } | null;
};
type Cat = {
  resizeDrawingSurfaceToCanvas(): void;
  viewModelInstance: VM | null;
  play(): void;
  pause(): void;
  cleanup(): void;
};
type Runtime = {
  RuntimeLoader: { setWasmUrl(url: string): void };
  Rive: new (options: Record<string, unknown>) => Cat;
};
let loading: Promise<Runtime> | undefined;
const path = base + "/demo/cat-companion-preview/";
function load() {
  return (loading ||= new Promise<Runtime>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = path + "rive.js";
    script.onload = () =>
      resolve((window as unknown as { rive: Runtime }).rive);
    script.onerror = () => {
      loading = undefined;
      script.remove();
      reject(Error("加载失败"));
    };
      document.head.appendChild(script);
  }));
}
export function CompanionCat({ busy, open }: { busy: boolean; open: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null),
    pet = useRef<Cat | null>(null),
    state = useRef({ busy, open });
  const [failed, setFailed] = useState(false);
  state.current = { busy, open };
  function act() {
    const cat = pet.current;
    const vm =
      cat?.viewModelInstance?.viewModel("propertyOfViewModel1") ||
      cat?.viewModelInstance;
    vm?.trigger(
      state.current.busy
        ? "animFocusLvl1"
        : state.current.open
          ? "animBreak"
          : "animIdle",
    )?.trigger();
  }
  useEffect(() => {
    let gone = false;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const root = canvas.current?.closest(".z-app");
    const sync = () => {
      const cat = pet.current;
      if (!cat) return;
      if (
        document.hidden ||
        reduced.matches ||
        root?.getAttribute("data-motion") === "off"
      )
        cat.pause();
      else cat.play();
    };
    const observer = new MutationObserver(sync);
    if (root)
      observer.observe(root, {
        attributes: true,
        attributeFilter: ["data-motion"],
      });
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    load()
      .then((runtime) => {
        if (gone || !canvas.current) return;
        runtime.RuntimeLoader.setWasmUrl(path + "rive.wasm");
        const cat = new runtime.Rive({
          src: path + "cat-pomodoro.riv",
          canvas: canvas.current,
          artboard: "Artboard",
          stateMachines: "State Machine 1",
          autoplay: true,
          autoBind: true,
          onLoad() {
            if (gone) return;
            cat.resizeDrawingSurfaceToCanvas();
            act();
            sync();
          },
          onLoadError() {
            if (!gone) setFailed(true);
          },
        });
        pet.current = cat;
      })
      .catch(() => {
        if (!gone) setFailed(true);
      });
    return () => {
      gone = true;
      observer.disconnect();
      reduced.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      pet.current?.cleanup();
      pet.current = null;
    };
  }, []);
  useEffect(() => {
    act();
  }, [busy, open]);
  return (
    <span className="z-pet-character" aria-hidden="true">
      {failed ? (
        <span className="z-pet-fallback">问问小猫</span>
      ) : (
        <canvas ref={canvas} />
      )}
    </span>
  );
}
