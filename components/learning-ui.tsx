"use client";
import { ArrowRight, LoaderCircle, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Chapter } from "../lib/domain";
export const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const endpoint = (path: string) => `${base}/api${path}`;
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(endpoint(path), {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new Error("服务暂时没有响应，请稍后重试。已保存的内容不会丢失。");
  }
  if (!response.ok) {
    const error =
      result &&
      typeof result === "object" &&
      "error" in result &&
      typeof result.error === "string"
        ? result.error
        : "请求没有完成，请重试。";
    throw new Error(error);
  }
  return result as T;
}
export function Brand() {
  return (
    <span className="brand">
      <svg
        className="brand-mark"
        viewBox="0 0 64 64"
        aria-hidden="true"
        focusable="false"
        data-brand-version="rounded-jing-v1"
      >
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 15 15 23 M23 27 14 36 M20 31 20 51" />
          <path d="M31 17H47Q44 26 31 33 M36 25 50 33" />
          <path d="M32 40H49 M40.5 40V51 M30 51H51" />
        </g>
      </svg>
      <span className="brand-copy">
        <strong>知径</strong>
      </span>
    </span>
  );
}
export function Spinner({ text }: { text: string }) {
  return (
    <span className="z-busy">
      <LoaderCircle size={18} className="z-spin" />
      {text}
    </span>
  );
}
export function ErrorNotice({ message }: { message: string }) {
  return message ? (
    <div className="z-error" role="alert">
      {message}
    </div>
  ) : null;
}
export function downloadText(name: string, text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Visual({ chapter }: { chapter: Chapter }) {
  const v = chapter.visual;
  return (
    <div
      className={`z-diagram z-diagram-${v.type}`}
      aria-label={`${chapter.title}的图解`}
    >
      {v.items.map((item, i) => (
        <div className="z-diagram-pair" key={i}>
          <div className="z-diagram-item">
            <span className="z-node-index">
              {String(i + 1).padStart(2, "0")}
            </span>
            <strong>{item.label}</strong>
            <p>{item.detail}</p>
          </div>
          {i < v.items.length - 1 && ["chain", "steps"].includes(v.type) && (
            <div className="z-relation">
              <ArrowRight size={20} />
              <span>{v.relation}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.body.style.overflow;
    const trigger = document.activeElement;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      dialog?.close();
      queueMicrotask(() => {
        if (trigger instanceof HTMLElement && trigger.isConnected)
          trigger.focus({ preventScroll: true });
      });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="z-modal"
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="z-modal-top">
        <h2>{title}</h2>
        <button aria-label="关闭" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
