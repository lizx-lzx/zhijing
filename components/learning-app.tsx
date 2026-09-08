"use client";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  Library,
  Play,
  Plus,
  Settings2,
  Sparkles,
} from "lucide-react";
import type { Answers, Lesson, Profile } from "../lib/domain";
import { defaultAnswers, normalizeAnswers } from "../lib/domain";
import StaggeredText from "./react-bits/staggered-text";
import {
  api,
  base,
  Brand,
  downloadText,
  ErrorNotice,
  Modal,
  Spinner,
} from "./learning-ui";
import { Onboarding, SkillEditor } from "./learning-onboarding";
import { LearningLibrary, Workbench } from "./learning-workbench";
import { LessonView } from "./learning-lesson";

export default function LearningApp() {
  const [boot, setBoot] = useState(true),
    [bootError, setBootError] = useState("");
  const [view, setView] = useState("welcome"),
    [profile, setProfile] = useState<Profile | null>(null),
    [lessons, setLessons] = useState<Lesson[]>([]),
    [lesson, setLesson] = useState<Lesson | null>(null);
  const [legacy, setLegacy] = useState<Answers | null>(null),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [account, setAccount] = useState(false),
    [recovery, setRecovery] = useState(""),
    [restore, setRestore] = useState(""),
    [hasRecovery, setHasRecovery] = useState(false);
  const refresh = useCallback(async () => {
    const data = await api<{
      profile: Profile | null;
      lessons: Lesson[];
      hasRecovery: boolean;
    }>("/me");
    setProfile(data.profile);
    setLessons(data.lessons);
    setHasRecovery(data.hasRecovery);
    return data;
  }, []);
  useEffect(() => {
    let active = true;
    api<{ profile: Profile | null; lessons: Lesson[]; hasRecovery: boolean }>(
      "/me",
    )
      .then(async (data) => {
        if (!active) return;
        setProfile(data.profile);
        setLessons(data.lessons);
        setHasRecovery(data.hasRecovery);
        setView(data.profile ? "workspace" : "welcome");
        const resume = new URL(window.location.href).searchParams.get("lesson");
        if (data.profile && resume && /^[a-f0-9]{32}$/.test(resume)) {
          try {
            const found = await api<{ lesson: Lesson }>(`/lessons/${resume}`);
            if (active) {
              setLesson(found.lesson);
              setView("learning");
            }
          } catch {
            if (active) setNotice("无法打开这份作品，请从自己的学习库选择。");
          }
        }
        if (!data.profile) {
          try {
            const old = JSON.parse(
              localStorage.getItem("zhijing-learning-profile") || "null",
            );
            if (old?.questionnaire)
              setLegacy(
                normalizeAnswers({
                  ...old.questionnaire,
                  primary:
                    old.questionnaire.entry === "video" ? "video" : "reading",
                  entry: ["story", "map", "question"].includes(
                    old.questionnaire.entry,
                  )
                    ? old.questionnaire.entry
                    : "adaptive",
                  support: old.questionnaire.support
                    ? [old.questionnaire.support]
                    : [],
                  avoid: [],
                }),
              );
          } catch {
            /* Keep original local prototype data untouched. */
          }
        }
      })
      .catch((e) => {
        if (active) setBootError(e.message);
      })
      .finally(() => {
        if (active) setBoot(false);
      });
    return () => {
      active = false;
    };
  }, [refresh]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (
      !["workspace", "library"].includes(view) ||
      !lessons.some((l) => ["queued", "working"].includes(l.status))
    )
      return;
    const timer = setInterval(() => void refresh().catch(() => {}), 6000);
    return () => clearInterval(timer);
  }, [view, lessons, refresh]);
  function go(next: string) {
    if (next !== "learning") {
      const url = new URL(window.location.href);
      url.searchParams.delete("lesson");
      window.history.replaceState(null, "", url);
    }
    setView(next);
    setError("");
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function saved(p: Profile) {
    setProfile(p);
    go("workspace");
    setNotice("学习方式已保存。以后可以直接开始。");
  }
  function generated(l: Lesson) {
    const url = new URL(window.location.href);
    url.searchParams.set("lesson", l.id);
    window.history.replaceState(null, "", url);
    setLesson(l);
    go("learning");
    void refresh();
  }
  async function open(id: string) {
    setBusy("正在打开作品");
    try {
      const data = await api<{ lesson: Lesson }>(`/lessons/${id}`);
      const url = new URL(window.location.href);
      url.searchParams.set("lesson", id);
      window.history.replaceState(null, "", url);
      setLesson(data.lesson);
      go("learning");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function makeRecovery() {
    setBusy("正在生成恢复码");
    try {
      const result = await api<{ code: string }>("/recovery", "POST", {});
      setRecovery(result.code);
      setHasRecovery(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function restoreAccount() {
    setBusy("正在恢复");
    setError("");
    try {
      await api("/recovery/restore", "POST", { code: restore });
      const data = await refresh();
      setAccount(false);
      setRestore("");
      setRecovery("");
      setLesson(null);
      go(data.profile ? "workspace" : "welcome");
      setNotice("学习方式和作品已恢复。");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  if (boot)
    return (
      <main className="z-loading">
        <Brand />
        <Spinner text="正在打开知径" />
      </main>
    );
  if (bootError)
    return (
      <main className="z-loading">
        <Brand />
        <p role="alert">暂时连接不上学习服务。</p>
        <button
          className="button button-primary"
          onClick={() => window.location.reload()}
        >
          重新连接
        </button>
      </main>
    );
  return (
    <div className={`z-app${profile ? " z-signed-in" : ""}`}>
      <a className="z-skip-link" href="#learning-content">
        跳到主要内容
      </a>
      <header className="z-top">
        <button
          className="z-brand-button"
          onClick={() => go(profile ? "workspace" : "welcome")}
          aria-label="知径首页"
        >
          <Brand />
        </button>
        {profile ? (
          <nav aria-label="主要导航">
            <button
              className={view === "workspace" ? "active" : ""}
              aria-current={view === "workspace" ? "page" : undefined}
              onClick={() => go("workspace")}
            >
              <Plus size={17} />
              开始学习
            </button>
            <button
              className={view === "library" ? "active" : ""}
              aria-current={view === "library" ? "page" : undefined}
              onClick={() => {
                void refresh();
                go("library");
              }}
            >
              <Library size={17} />
              学习库
            </button>
            <button
              className={view === "profile" ? "active" : ""}
              aria-current={view === "profile" ? "page" : undefined}
              onClick={() => go("profile")}
            >
              <Settings2 size={17} />
              我的学法
            </button>
          </nav>
        ) : (
          <span className="z-top-note">你的个人学习空间</span>
        )}
        <button
          className="z-account"
          onClick={() => {
            setError("");
            setAccount(true);
          }}
        >
          保存与恢复
        </button>
      </header>
      <div className="z-main-area" id="learning-content">
        {notice && (
          <div className="z-toast" role="status">
            <Check size={18} />
            {notice}
          </div>
        )}
        {busy && !account && (
          <div className="z-global-busy" role="status">
            <Spinner text={busy} />
          </div>
        )}
        {error && !account && (
          <div className="z-container">
            <ErrorNotice message={error} />
          </div>
        )}
        {view === "welcome" && (
          <main className="z-welcome z-container">
            <div className="z-welcome-copy">
              <span className="z-kicker">让长文更容易开始</span>
              <StaggeredText
                as="h1"
                text={"知识不必难读。\n换成你的讲法。"}
                segmentBy="lines"
                blur={false}
                delay={60}
                duration={0.25}
                from={{ opacity: 1, y: 8 }}
                to={{ opacity: 1, y: 0 }}
                respectReducedMotion
              />
              <p>一次了解你的偏好，以后把文章变成适合你的视频、图文或音频。</p>
              <button
                className="button button-primary button-large"
                onClick={() => go("questionnaire")}
              >
                {legacy ? "接着上次的偏好" : "找到我的学法"}
                <ArrowRight size={18} />
              </button>
              <span className="z-welcome-meta">
                8 题 · 约 2 分钟 · 随时可改
              </span>
              <ol className="z-welcome-steps" aria-label="使用流程">
                <li>
                  <span>01</span>了解偏好
                </li>
                <li>
                  <span>02</span>放入文章
                </li>
                <li>
                  <span>03</span>开始学习
                </li>
              </ol>
            </div>
            <div className="z-welcome-card">
              <div className="z-card-cap">
                <Sparkles size={19} />
                <span>先看看，一篇文章可以变成什么</span>
              </div>
              <a
                className="z-featured-lesson"
                href={`${base}/demo/zhihu-window-20260908/?ui=4244aa2`}
              >
                <div
                  className="z-featured-cover"
                  style={{
                    backgroundImage: `url(${base}/demo/zhihu-window-20260908/media/poster.jpg)`,
                  }}
                >
                  <span>
                    <Play size={22} fill="currentColor" />
                    查看成品
                  </span>
                </div>
                <div className="z-featured-copy">
                  <span>知乎长文学习版 · 6 分 49 秒</span>
                  <h2>窗口期可能只剩五年</h2>
                  <p>视频、10 张图解、音频与笔记</p>
                  <strong>
                    打开这份学习作品 <ArrowRight size={18} />
                  </strong>
                </div>
              </a>
              <p className="z-featured-note">
                使用示例偏好的单篇作品，内容含作者推演。
              </p>
            </div>
          </main>
        )}
        {view === "questionnaire" && (
          <Onboarding
            initial={profile?.answers || legacy || defaultAnswers}
            onSave={saved}
            onCancel={() => go(profile ? "profile" : "welcome")}
          />
        )}
        {view === "profile" && profile && (
          <SkillEditor
            key={profile.updatedAt}
            profile={profile}
            existing
            onSave={saved}
            onBack={() => go("workspace")}
            onRetake={() => go("questionnaire")}
          />
        )}
        {view === "workspace" && profile && (
          <Workbench
            profile={profile}
            lessons={lessons}
            onOpen={(id) => void open(id)}
            onGenerated={generated}
            onProfile={() => go("profile")}
            onLibrary={() => go("library")}
          />
        )}
        {view === "library" && (
          <LearningLibrary
            lessons={lessons}
            onOpen={(id) => void open(id)}
            onAdd={() => go("workspace")}
          />
        )}
        {view === "learning" && lesson && (
          <LessonView
            key={lesson.id}
            initial={lesson}
            onBack={() => {
              void refresh();
              go("library");
            }}
            onUpdate={() => void refresh()}
            onRegenerated={generated}
            notify={setNotice}
          />
        )}
        {account && (
          <Modal title="把学习带到下一台设备" onClose={() => setAccount(false)}>
            <p>
              偏好与作品已保存在服务器。恢复码是你的私人钥匙，换浏览器或清除
              Cookie 后，用它找回内容。
            </p>
            {recovery ? (
              <div className="z-recovery">
                <label>
                  请私下保存，不要发给别人
                  <input
                    readOnly
                    value={recovery}
                    onFocus={(e) => e.target.select()}
                  />
                </label>
                <button
                  className="button button-primary"
                  onClick={() =>
                    downloadText(
                      "知径-私人恢复码.txt",
                      `知径：${window.location.origin}${base}/\n私人恢复码：${recovery}\n请勿分享。持有码的人可访问你的学习内容。`,
                    )
                  }
                >
                  下载保存恢复码
                </button>
              </div>
            ) : (
              <button
                className="button button-primary"
                disabled={!!busy}
                onClick={() => void makeRecovery()}
              >
                {hasRecovery ? "生成新恢复码（旧码会失效）" : "生成我的恢复码"}
              </button>
            )}
            <hr />
            <h3>已有恢复码？</h3>
            <label className="z-field-label">
              恢复码
              <input
                value={restore}
                onChange={(e) => setRestore(e.target.value)}
                placeholder="粘贴以前保存的恢复码"
                autoComplete="off"
              />
            </label>
            <ErrorNotice message={error} />
            <button
              className="button button-quiet"
              disabled={!!busy || !restore.trim()}
              onClick={() => void restoreAccount()}
            >
              {busy ? <Spinner text={busy} /> : "恢复我的学习库"}
            </button>
          </Modal>
        )}
        <footer className="z-footer z-container">
          <span>知径</span>
          <span>AI 辅助理解 · 重要判断请核对原文</span>
        </footer>
      </div>
    </div>
  );
}
