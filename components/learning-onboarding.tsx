"use client";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  ShieldCheck,
} from "lucide-react";
import {
  buildProfile,
  defaultAnswers,
  mediaLabels,
  questions,
} from "../lib/domain";
import type { Answers, Medium, Profile } from "../lib/domain";
import { api, endpoint, ErrorNotice, Spinner } from "./learning-ui";

export function SkillEditor({
  profile,
  onSave,
  onBack,
  existing = false,
  onRetake,
}: {
  profile: Profile;
  onSave: (p: Profile) => void;
  onBack: () => void;
  existing?: boolean;
  onRetake?: () => void;
}) {
  const [draft, setDraft] = useState(profile),
    [editing, setEditing] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [versions, setVersions] = useState<
    { id: string; profile: Profile; createdAt: string }[]
  >([]);
  async function save() {
    setBusy(true);
    setError("");
    try {
      const data = await api<{ profile: Profile }>("/profile", "PUT", {
        profile: draft,
      });
      onSave(data.profile);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="z-container-small z-profile">
      <div className="z-page-heading">
        <span className="z-kicker">
          {existing ? "属于你的讲解说明书" : "为你整理的初稿"}
        </span>
        <h1>{draft.name}</h1>
        <p>{draft.summary}</p>
      </div>
      <div className="z-profile-banner">
        <ShieldCheck size={20} />
        <span>这是偏好，不是能力测评。改动只有在你保存后才生效。</span>
      </div>
      <div className="z-rule-list">
        {draft.rules.map((r) => (
          <section key={r.id} className="z-rule">
            <div>
              <span>{r.evidence}</span>
              <h3>{r.title}</h3>
            </div>
            {editing === r.id ? (
              <textarea
                aria-label={`编辑${r.title}`}
                value={r.instruction}
                maxLength={1500}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    rules: draft.rules.map((rule) =>
                      rule.id === r.id
                        ? { ...rule, instruction: e.target.value }
                        : rule,
                    ),
                  })
                }
              />
            ) : (
              <p>{r.instruction}</p>
            )}
            {["entry", "goal", "support", "pace", "personal"].includes(
              r.id,
            ) && (
              <button
                className="z-text-link"
                onClick={() => setEditing(editing === r.id ? null : r.id)}
              >
                {editing === r.id ? "收起编辑" : "修改这条"}
              </button>
            )}
          </section>
        ))}
      </div>
      <ErrorNotice message={error} />
      <div className="z-profile-actions">
        <button
          className="button button-quiet"
          onClick={onBack}
          disabled={busy}
        >
          <ArrowLeft size={16} />
          返回
        </button>
        <button
          className="button button-primary button-large"
          onClick={() => void save()}
          disabled={busy}
        >
          {busy ? <Spinner text="正在保存" /> : "保存并开始学习"}
          <ArrowRight size={17} />
        </button>
        {existing && (
          <>
            <button className="button button-quiet" onClick={onRetake}>
              重新做问卷
            </button>
            <a
              className="button button-quiet"
              href={endpoint("/profile/export")}
            >
              <Download size={16} />
              下载 Skill
            </a>
          </>
        )}
      </div>
      {existing && (
        <details
          className="z-detail"
          onToggle={(e) => {
            if (e.currentTarget.open)
              void api<{ versions: typeof versions }>("/profile/versions")
                .then((d) => setVersions(d.versions))
                .catch((e) => setError(e.message));
          }}
        >
          <summary>以前的版本</summary>
          {versions.map((v) => (
            <button
              className="z-version"
              key={v.id}
              onClick={() => {
                setDraft(v.profile);
                setEditing(null);
              }}
            >
              <span>{new Date(v.createdAt).toLocaleString("zh-CN")}</span>
              <strong>{v.profile.name}</strong>
              <span>载入预览，保存后才恢复</span>
            </button>
          ))}
        </details>
      )}
    </main>
  );
}

export function Onboarding({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Answers;
  onSave: (p: Profile) => void;
  onCancel: () => void;
}) {
  const [answers, setAnswers] = useState<Answers>(
      initial || { ...defaultAnswers },
    ),
    [step, setStep] = useState(0),
    [draft, setDraft] = useState<Profile | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const q = questions[step];
  async function design() {
    setBusy(true);
    setError("");
    try {
      const data = await api<{ profile: Profile }>("/profile/design", "POST", {
        answers,
      });
      setDraft(data.profile);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (draft)
    return (
      <SkillEditor
        profile={draft}
        onSave={onSave}
        onBack={() => setDraft(null)}
      />
    );
  return (
    <main className="z-onboarding z-container-small">
      <div className="z-question-meta">
        <span>
          第 {step + 1} / {questions.length} 题
        </span>
        <strong>可以随时改，不用一次选准</strong>
      </div>
      <div
        className="z-progress"
        role="progressbar"
        aria-label="问卷进度"
        aria-valuemin={0}
        aria-valuemax={8}
        aria-valuenow={step + 1}
      >
        <span style={{ width: `${((step + 1) / 8) * 100}%` }} />
      </div>
      <div className="z-groups">
        {["认识你的学习习惯", "找到更容易看懂的讲法", "按你舒服的节奏来"].map(
          (g, i) => (
            <span className={q.group === g ? "active" : ""} key={g}>
              {i + 1} · {g}
            </span>
          ),
        )}
      </div>
      <section key={step} className="z-question">
        <h1>{q.title}</h1>
        {q.help && <p className="z-help">{q.help}</p>}
        <div className="z-choices">
          {q.options.map((option) => {
            const value = answers[q.id];
            const selected = q.multiple
              ? Array.isArray(value) &&
                (value as string[]).includes(option.value)
              : value === option.value;
            return (
              <button
                key={option.value}
                className={`z-choice ${selected ? "selected" : ""}`}
                aria-pressed={selected}
                onClick={() =>
                  setAnswers((a) => {
                    if (q.multiple) {
                      const values = a[q.id] as string[];
                      return {
                        ...a,
                        [q.id]: selected
                          ? values.filter((v) => v !== option.value)
                          : [...values, option.value],
                      };
                    }
                    return {
                      ...a,
                      [q.id]: option.value,
                      ...(q.id === "primary"
                        ? { extras: a.extras.filter((v) => v !== option.value) }
                        : {}),
                    };
                  })
                }
              >
                <span className="z-check">
                  {selected && <Check size={16} />}
                </span>
                <span>
                  <strong>{option.label}</strong>
                  {option.detail && <small>{option.detail}</small>}
                </span>
              </button>
            );
          })}
        </div>
        {q.id === "primary" && (
          <div className="z-extras">
            <span>还想同时得到（可不选）</span>
            <div>
              {(Object.keys(mediaLabels) as Medium[])
                .filter((m) => m !== answers.primary)
                .map((m) => (
                  <label key={m}>
                    <input
                      type="checkbox"
                      checked={answers.extras.includes(m)}
                      onChange={(e) =>
                        setAnswers((a) => ({
                          ...a,
                          extras: e.target.checked
                            ? [...a.extras, m]
                            : a.extras.filter((x) => x !== m),
                        }))
                      }
                    />
                    {mediaLabels[m]}
                  </label>
                ))}
            </div>
          </div>
        )}
        {step === 7 && (
          <label className="z-note-label">
            还有什么想告诉我们？（选填）
            <textarea
              maxLength={600}
              value={answers.note}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, note: e.target.value }))
              }
              placeholder="比如：喜欢有情绪和画面感的故事；不喜欢过多术语。"
            />
          </label>
        )}
        <ErrorNotice message={error} />
        <div className="z-question-actions">
          <button
            className="button button-quiet"
            onClick={() => (step ? setStep(step - 1) : onCancel())}
            disabled={busy}
          >
            <ArrowLeft size={17} />
            上一步
          </button>
          <button
            className="button button-primary button-large"
            disabled={busy}
            onClick={() => (step === 7 ? void design() : setStep(step + 1))}
          >
            {busy ? (
              <Spinner text="正在整理你的学习方式" />
            ) : step === 7 ? (
              "生成我的学习方式"
            ) : (
              "下一步"
            )}
            {!busy && <ArrowRight size={17} />}
          </button>
        </div>
        {error && step === 7 && (
          <button
            className="z-text-link"
            onClick={() => setDraft(buildProfile(answers))}
          >
            先用基础规则继续，之后可以再调整
          </button>
        )}
      </section>
    </main>
  );
}
