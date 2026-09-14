"use client";
import { useEffect, useRef, useState } from "react";
import { api, Modal } from "./learning-ui";
import { CompanionCat } from "./companion-cat";
type Message = {
  role: string;
  text: string;
  citations?: { id: string; quote: string }[];
};
export function ReadingCompanion({
  lessonId,
  target,
  onSource,
}: {
  lessonId?: string;
  target: {
    id: string;
    title: string;
    nonce: number;
    paragraphIndex?: number;
  } | null;
  onSource: (ids: string[], text: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false);
  const [scope, setScope] = useState<{
      id: string;
      title: string;
      paragraphIndex?: number;
    } | null>(null),
    [messages, setMessages] = useState<Message[]>([]),
    [question, setQuestion] = useState(""),
    [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const chatPath = lessonId ? `/lessons/${lessonId}/chat` : "/companion/chat";
  const conversation = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (conversation.current)
      conversation.current.scrollTop = conversation.current.scrollHeight;
  }, [messages, busy, open]);
  useEffect(() => {
    if (target) {
      setScope(target);
      setOpen(true);
    }
  }, [target]);
  useEffect(() => {
    if (!open || loaded) return;
    let active = true;
    api<{ messages: Message[] }>(chatPath)
      .then((d) => {
        if (active) {
          setMessages(d.messages);
          setLoaded(true);
          setError("");
        }
      })
      .catch(() => {
        if (active) setError("对话暂时无法读取，请关闭后重试。");
      });
    return () => {
      active = false;
    };
  }, [open, loaded, chatPath]);
  async function send(text: string) {
    if (busy || !loaded || !text.trim()) return;
    setBusy(true);
    setError("");
    try {
      const d = await api<{ messages: Message[] }>(chatPath, "POST", {
        question: text,
        chapterId: scope?.id,
        paragraphIndex: scope?.paragraphIndex,
      });
      setMessages(d.messages);
      setQuestion("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        className="z-pet"
        aria-label="打开陪读小猫"
        onClick={() => {
          setScope(null);
          setOpen(true);
        }}
      >
        <CompanionCat busy={busy} open={open} />
      </button>
      {open && (
        <Modal title="陪读小猫" onClose={() => setOpen(false)}>
          <div className="z-pet-scope">
            {scope
              ? `正在聊：${scope.title}`
              : lessonId
                ? "正在聊这篇文章"
                : "小猫陪你聊聊"}
            {scope && (
              <button className="z-text-link" onClick={() => setScope(null)}>
                聊整篇
              </button>
            )}
          </div>
          <div className="z-pet-messages" aria-live="polite" ref={conversation}>
            {!messages.length && <p>哪里没懂？我们一起看看。</p>}
            {messages.map((m, i) => (
              <div className={`z-pet-message ${m.role}`} key={i}>
                <strong>{m.role === "user" ? "你" : "小猫"}</strong>
                <p>{m.text}</p>
                {m.citations?.map((c, j) => (
                  <button
                    className="z-text-link"
                    key={j}
                    onClick={() => {
                      setOpen(false);
                      onSource([c.id], c.quote);
                    }}
                  >
                    查看原文：{c.quote.slice(0, 32)}…
                  </button>
                ))}
              </div>
            ))}
            {busy && <p role="status">小猫正在翻书…</p>}
          </div>
          <div className="z-pet-shortcuts">
            {(lessonId
              ? ["讲简单点", "换个例子", "帮我回顾重点", "问我一个小问题"]
              : [
                  "怎么开始学习？",
                  "帮我选一种学习方式",
                  "今天不太想学，陪我聊聊",
                  "怎么找到之前的文章？",
                ]
            ).map((t) => (
              <button
                className="button button-quiet"
                disabled={busy || !loaded}
                key={t}
                onClick={() => void send(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(question);
            }}
          >
            <textarea
              aria-label="问小猫"
              placeholder="写下你想问的…"
              value={question}
              maxLength={2000}
              onChange={(e) => setQuestion(e.target.value)}
              className="z-pet-input"
            />
            <div className="z-pet-actions">
              <button
                type="button"
                className="z-text-link"
                onClick={() => {
                  setOpen(false);
                }}
              >
                继续阅读
              </button>
              <button
                className="button button-primary"
                disabled={busy || !loaded || !question.trim()}
              >
                发送
              </button>
            </div>
          </form>
          {error && <p role="alert">{error}</p>}
          <small className="z-pet-credit">
            <a
              href="https://rive.app/marketplace/27136-51126-cat-pomodoro/"
              target="_blank"
              rel="noreferrer"
            >
              Cat Pomodoro · AnggaMotion
            </a>{" "}
            ·{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noreferrer"
            >
              CC BY 4.0
            </a>{" "}
            · 知径交互改编
          </small>
        </Modal>
      )}
    </>
  );
}
