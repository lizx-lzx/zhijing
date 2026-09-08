import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";
import { AppError, requiredText } from "./config.mjs";

export function normalizeZhihuUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new AppError("请粘贴完整的知乎文章链接，或直接提供正文。");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !["zhuanlan.zhihu.com", "www.zhihu.com"].includes(url.hostname)
  )
    throw new AppError(
      "目前支持 HTTPS 知乎文章链接；其他内容可以直接粘贴正文。",
    );
  if (
    !/^\/p\/\d+\/?$/.test(url.pathname) &&
    !/^\/question\/\d+\/answer\/\d+\/?$/.test(url.pathname)
  )
    throw new AppError("请使用具体的知乎文章或回答链接。");
  url.search = "";
  url.hash = "";
  return url.toString();
}
export function splitSource(text) {
  const clean = Array.from(
    requiredText(text, 100, 45000, "正文").replace(/\r/g, ""),
  )
    .filter((c) => c.charCodeAt(0) >= 32 || c === "\n" || c === "\t")
    .join("");
  const paragraphs = clean
    .split(/\n\s*\n|\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const chunks = [];
  for (const p of paragraphs) {
    if (p.length <= 900) chunks.push(p);
    else {
      let rest = p;
      while (rest.length > 900) {
        let end = rest.lastIndexOf("。", 900);
        if (end < 300) end = 899;
        chunks.push(rest.slice(0, end + 1));
        rest = rest.slice(end + 1);
      }
      if (rest) chunks.push(rest);
    }
  }
  return chunks.map((text, i) => ({ id: `p${i + 1}`, text }));
}
export function parseArticle(html, url) {
  const { document } = parseHTML(html);
  let title =
    document
      .querySelector('meta[property="og:title"]')
      ?.getAttribute("content") ||
    document.querySelector("h1")?.textContent ||
    document.title ||
    "未命名文章";
  const rich = document.querySelector(
    ".Post-RichText, .RichContent-inner .RichText, article .RichText",
  );
  let body = "";
  if (rich) {
    rich
      .querySelectorAll("script,style,button,nav")
      .forEach((el) => el.remove());
    body = [...rich.querySelectorAll("p,h2,h3,h4,li,blockquote,pre")]
      .map((el) => el.textContent)
      .join("\n\n");
  }
  if (body.length < 100) {
    try {
      const parsed = new Readability(document, { charThreshold: 100 }).parse();
      body = parsed?.textContent || "";
      title = parsed?.title || title;
    } catch {
      body = "";
    }
  }
  if (body.length < 100 || /安全验证|访问异常|请求存在异常/.test(title))
    throw new AppError(
      "知乎暂时不允许读取这篇文章。请复制正文到“粘贴正文”，无需重填问卷。",
      422,
      "SOURCE_RESTRICTED",
    );
  return {
    title: title.replace(/\s*[-–]\s*知乎$/, "").slice(0, 160),
    url,
    mode: "link",
    blocks: splitSource(body),
  };
}
export async function acquireSource(input) {
  if (typeof input.text === "string" && input.text.trim())
    return {
      title:
        typeof input.title === "string" && input.title.trim()
          ? input.title.trim().slice(0, 160)
          : input.text.trim().split("\n")[0].slice(0, 60),
      url: input.url ? normalizeZhihuUrl(input.url) : "",
      mode: "text",
      blocks: splitSource(input.text),
    };
  let url = normalizeZhihuUrl(requiredText(input.url, 10, 2048, "链接"));
  try {
    for (let redirects = 0; redirects < 3; redirects++) {
      const response = await fetch(url, {
        redirect: "manual",
        headers: {
          Accept: "text/html",
          "User-Agent": "ZhijingLearning/1.0 (user-requested article preview)",
        },
        signal: AbortSignal.timeout(18000),
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        url = normalizeZhihuUrl(
          new URL(response.headers.get("location") || "", url).toString(),
        );
        continue;
      }
      if (!response.ok)
        throw new AppError(
          "知乎暂时不允许读取这篇文章。请复制正文到“粘贴正文”，无需重填问卷。",
          422,
          "SOURCE_RESTRICTED",
        );
      if (!response.headers.get("content-type")?.includes("text/html"))
        throw new AppError("这个链接没有返回文章页面，请粘贴正文。", 422);
      const reader = response.body.getReader();
      let size = 0;
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 2500000) {
          await reader.cancel();
          throw new AppError("页面过大，请直接粘贴正文。", 422);
        }
        chunks.push(value);
      }
      return parseArticle(Buffer.concat(chunks).toString("utf8"), url);
    }
    throw new AppError("文章发生了过多跳转，请直接粘贴正文。", 422);
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError(
      "暂时无法连接知乎。可以直接粘贴正文，继续生成。",
      422,
      "SOURCE_UNAVAILABLE",
    );
  }
}
