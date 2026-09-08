"use client";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  FileText,
  Headphones,
  Library,
  MonitorPlay,
  Play,
  Plus,
  Settings2,
  Sparkles,
} from "lucide-react";
import type { Answers, Lesson, Profile } from "../lib/domain";
import { defaultAnswers, mediaLabels, normalizeAnswers } from "../lib/domain";
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
      .then((data) => {
        if (!active) return;
        setProfile(data.profile);
        setLessons(data.lessons);
        setHasRecovery(data.hasRecovery);
        setView(data.profile ? "workspace" : "welcome");
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
    setLesson(l);
    go("learning");
    void refresh();
  }
  async function open(id: string) {
    setBusy("正在打开作品");
    try {
      const data = await api<{ lesson: Lesson }>(`/lessons/${id}`);
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
    <div className="z-app">
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
              onClick={() => go("workspace")}
            >
              <Plus size={17} />
              开始学习
            </button>
            <button
              className={view === "library" ? "active" : ""}
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
              onClick={() => go("profile")}
            >
              <Settings2 size={17} />
              我的学法
            </button>
          </nav>
        ) : (
          <span className="z-top-note">一次了解，以后自动适配</span>
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
            <span className="z-kicker">从不想读，到愿意懂</span>
            <h1>
              知识不必难读。
              <br />
              <span className="z-accent">换成你的讲法。</span>
            </h1>
            <p>
              告诉我们你的学习习惯。以后给一篇文章，
              <br className="z-desktop" />
              就能拿到适合你的视频、图文或音频。
            </p>
            <button
              className="button button-primary button-large"
              onClick={() => go("questionnaire")}
            >
              {legacy ? "接着上次的偏好" : "开始了解我的学习方式"}
              <ArrowRight size={18} />
            </button>
            <span className="z-welcome-meta">
              8 个简短问题 · 约 2 分钟 · 随时可改
            </span>
          </div>
          <div className="z-welcome-card">
            <div className="z-card-cap">
              <Sparkles size={19} />
              <span>你的学习方式</span>
            </div>
            <h2>
              同一篇内容，
              <br />
              可以有不同的入口。
            </h2>
            <div className="z-path-example">
              <span>喜欢故事</span>
              <i>→</i>
              <strong>先走进一个情境</strong>
            </div>
            <div className="z-path-example">
              <span>喜欢分析</span>
              <i>→</i>
              <strong>先看到结论与依据</strong>
            </div>
            <div className="z-media-row">
              {[MonitorPlay, FileText, Headphones, Play].map((Icon, i) => (
                <span key={i}>
                  <Icon size={19} />
                  {Object.values(mediaLabels)[i]}
                </span>
              ))}
            </div>
            <p>不是给你贴标签，是让知识更容易靠近你。</p>
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
        <span>知径 · 让知识按你的方式展开</span>
        <span>AI 辅助理解，不替代来源核验</span>
      </footer>
    </div>
  );
}
