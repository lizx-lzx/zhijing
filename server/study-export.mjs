import { diagramSVG } from "./player.mjs";
const escape = (value) =>
  String(value || "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function studyHTML(result, source, audio = "", personalNotes = "") {
  const text = (value) =>
    String(value || "")
      .split(/\n+/)
      .filter(Boolean)
      .map((p) => `<p>${escape(p)}</p>`)
      .join("");
  const study = result.study;
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(result.title)} · 知径</title><style>
*{box-sizing:border-box}body{margin:0;background:#f5f1e8;color:#2b2926;font:17px/1.9 system-ui,"PingFang SC",sans-serif}main{max-width:900px;padding:32px 24px;margin:auto}h1{font-family:"Songti SC","Noto Serif CJK SC",serif;font-weight:500;font-size:32px;line-height:1.4}h2{font-size:25px;line-height:1.6}h3{font-size:20px}section{border-top:1px solid #ded7c9;padding:24px 0}a{color:#b3402a}nav{display:flex;flex-wrap:wrap;gap:12px}details{margin:16px 0;padding:14px 18px;border:1px solid #ded7c9;border-radius:4px;background:#fbf8f1}summary{cursor:pointer}svg{width:100%;max-width:640px;height:auto}blockquote{border-left:3px solid #b9af9e;padding-left:18px;margin-left:0}.note{background:#ebe5d9;padding:18px;border-radius:12px}.source{font-size:15px;color:#736b61}audio{width:100%}@media print{body{background:white}details{break-inside:avoid}audio{display:none}}
</style><main><a href="#top">知径 · 离线学习作品</a><h1 id="top">${escape(result.title)}</h1><p class="source">${escape(source.title)}${source.url ? ` · <a href="${escape(source.url)}">原始链接</a>` : ""} · AI 改编不是外部事实认证。</p>${text(result.lead)}${audio ? `<audio controls preload="metadata" src="${escape(audio)}"></audio><p class="source">AI 配音 · 随本文件保存的听读内容</p>` : ""}<nav>${result.chapters.map((c, i) => `<a href="#${escape(c.id)}">${i + 1}. ${escape(c.title)}</a>`).join("")}</nav>
${result.chapters
  .map(
    (c, i) =>
      `<section id="${escape(c.id)}"><h2>${i + 1}. ${escape(c.title)}</h2>${c.fictional ? "<p>教学虚构情境</p>" : ""}${text(c.body)}${diagramSVG(c)}${c.takeaway ? `<p class="note">${escape(c.takeaway)}</p>` : ""}${text(c.premise)}<details><summary>原文依据</summary>${(c.evidence || []).map((e) => `<blockquote>${escape(e.quote)} <span class="source">${escape(e.sourceId)}</span></blockquote>`).join("")}${source.blocks
        .filter((b) => c.sourceIds.includes(b.id))
        .map((b) => `<p>${escape(b.id)} · ${escape(b.text)}</p>`)
        .join("")}</details></section>`,
  )
  .join("")}
${study ? `<section><h2>全文关系</h2>${study.overview.groups.map((g) => `<h3>${escape(g.title)}</h3>${text(g.description)}<nav>${g.chapterIds.map((id) => `<a href="#${escape(id)}">${escape(result.chapters.find((c) => c.id === id)?.title)}</a>`).join("")}</nav>`).join("")}${study.overview.connections.map((r) => `<p>${escape(result.chapters.find((c) => c.id === r.from)?.title)} — ${escape(r.label)} — ${escape(result.chapters.find((c) => c.id === r.to)?.title)}</p>`).join("")}</section><section><h2>术语速查</h2>${study.glossary.map((g) => `<details><summary>${escape(g.term)}</summary>${text(g.explanation)}</details>`).join("")}</section><section><h2>互动推演（可跳过）</h2><p>以下为教学假设，不是预测模型。</p>${study.scenarios.map((s) => `<h3>${escape(s.title)}</h3>${text(s.setup)}${s.options.map((o) => `<details><summary>${escape(o.label)}</summary><p>${o.path.map(escape).join(" → ")}</p>${text(o.explanation)}</details>`).join("")}${text(s.takeaway)}`).join("")}</section><section><h2>复习卡</h2>${result.chapters.map((c) => `<details><summary>${escape(c.recallQuestion)}</summary>${text(c.takeaway)}${text(c.premise)}</details>`).join("")}</section><section><h2>听读讲稿</h2>${result.chapters.map((c) => `<h3>${escape(c.title)}</h3>${text(c.audioNarration)}`).join("")}</section><section><h2>阅读边界</h2>${study.boundaries.map(text).join("")}</section>` : ""}
<section><h2>带走的判断</h2>${result.takeaways.map(text).join("")}</section>${result.quiz.length ? `<section><h2>可选自测</h2>${result.quiz.map((q) => `<h3>${escape(q.question)}</h3><ol>${q.options.map((o) => `<li>${escape(o)}</li>`).join("")}</ol><details><summary>直接看解释</summary><p>${escape(q.options[q.correct])}</p>${text(q.explanation)}</details>`).join("")}</section>` : ""}${personalNotes ? `<section><h2>我的笔记</h2>${text(personalNotes)}</section>` : ""}<footer>知径 · 原文、解释、虚构情境与预测应分别理解。</footer></main></html>`;
}
