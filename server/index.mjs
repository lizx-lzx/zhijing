import http from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { config, AppError } from "./config.mjs";
import {
  db,
  uid,
  hash,
  now,
  one,
  all,
  run,
  session,
  setSession,
  limit,
  getProfile,
  saveProfile,
  getSource,
  lessonView,
  ownedLesson,
  updateLesson,
} from "./store.mjs";
import { designProfile, analyzeContent, composeLesson } from "./model.mjs";
import { acquireSource, splitSource } from "./source.mjs";
import { produceMedia, mediaDir } from "./media.mjs";
import { playerHTML, diagramSVG } from "./player.mjs";
import {
  buildProfile,
  mediaLabels,
  skillMarkdown,
  profileForLesson,
} from "../lib/domain.ts";

const sampleText = `平均数为什么不一定代表大多数人？

假设一个五人读书组记录了一个月的阅读量，分别是 1、2、2、3、22 本。这是为了讲清统计概念而设计的虚构数据，不是实际调查。

把五个人的阅读量相加，得到 30 本。除以五个人，人均就是 6 本。这个平均数没有算错，它回答的是：如果把总阅读量平均分给每个人，每个人会分到多少？

但如果读了两本书的小林看到“人均六本”，就认为自己远远落后于大多数人，这个判断就有问题。五个人中有四个人都没有达到六本。平均数不一定等于多数人的实际水平。

原因在于，22 这个较大的数对总量有明显影响。平均数使用了所有数值，所以会受到特别大或特别小的数的影响。这不是平均数的缺陷，而是它的性质。对总量、人均成本和总体变化等问题，这个性质仍然有用。

再看中位数。把五个数从小到大排列为 1、2、2、3、22，中间第三个数是 2。中位数描述排序后的中间位置。如果人数是偶数，通常取中间两个数的平均数作为中位数。

中位数并不告诉我们所有人的具体情况。这里两个人都读了两本，还有人读一本、三本、二十二本。只看中位数仍然会丢掉分布信息，也不能据此评价每个人学习的质量。

因此，看统计数字时，先问它要回答什么问题。问一共读了多少，答案是三十本；问人均读了多少，是六本；想了解一个通常水平，可以结合中位数两本与完整分布一起判断。

这个方法也提醒我们：读到工资、消费、学习时间等统计信息时，要区分平均值、中间位置、样本范围和分布。不过，不同数据的收集方式会影响结论，不能把这个五人虚构案例直接当作现实人群的证据。`;

async function body(req) {
  if (!String(req.headers["content-type"] || "").startsWith("application/json"))
    throw new AppError("请使用 JSON 请求。", 415);
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 220000)
      throw new AppError("内容太长，请控制在 45000 字以内。", 413);
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString());
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error();
    return value;
  } catch {
    throw new AppError("请求格式不正确。");
  }
}
const json = (res, status, data) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
};
function csrf(req) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const origin = req.headers.origin;
  if (origin && origin !== config.origin)
    throw new AppError("请从本站提交。", 403, "ORIGIN_DENIED");
  if (req.headers["sec-fetch-site"] === "cross-site")
    throw new AppError("请从本站提交。", 403);
}
function keyIP(req) {
  return config.production
    ? String(req.headers["x-real-ip"] || req.socket.remoteAddress)
    : String(req.socket.remoteAddress);
}
function cleanProfile(value) {
  const base = buildProfile(value.answers || {});
  base.name =
    typeof value.name === "string" ? value.name.slice(0, 50) : base.name;
  base.summary =
    typeof value.summary === "string"
      ? value.summary.slice(0, 200)
      : base.summary;
  base.engine = value.engine === "ai" ? "ai" : "rules";
  const editable = new Set(["entry", "goal", "support", "pace", "personal"]);
  base.rules = base.rules.map((r) => {
    const v = Array.isArray(value.rules)
      ? value.rules.find((x) => x.id === r.id)
      : null;
    return editable.has(r.id) &&
      typeof v?.instruction === "string" &&
      v.instruction.trim()
      ? { ...r, instruction: v.instruction.trim().slice(0, 1500) }
      : r;
  });
  return base;
}
function insertSource(user, s) {
  const id = uid();
  run(
    "INSERT INTO sources VALUES(?,?,?,?,?,?,?)",
    id,
    user,
    s.title,
    s.url,
    s.mode,
    JSON.stringify(s.blocks),
    now(),
  );
  return getSource(user, id);
}
function createJob(user, ip, sourceId, formats, overrides) {
  const source = getSource(user, sourceId),
    savedProfile = getProfile(user);
  if (!savedProfile)
    throw new AppError("请先完成一次学习偏好设置。", 409, "PROFILE_REQUIRED");
  const profile = profileForLesson(savedProfile, overrides);
  if (
    one(
      "SELECT COUNT(*) AS n FROM lessons WHERE status IN ('queued','working')",
    ).n >= 12
  )
    throw new AppError("当前制作队列已满，请稍后再试。", 429, "QUEUE_FULL");
  if (
    one(
      "SELECT COUNT(*) AS n FROM lessons WHERE user_id=? AND status IN ('queued','working')",
      user,
    ).n >= 2
  )
    throw new AppError(
      "你已有作品正在制作，完成后再试。",
      429,
      "USER_QUEUE_FULL",
    );
  limit("jobs:global", config.maxDailyJobs);
  limit("jobs:ip:" + hash(ip), config.maxIpJobs);
  limit("jobs:user:" + user, config.maxUserJobs);
  const selected = Array.isArray(formats)
    ? [...new Set(formats.filter((f) => Object.hasOwn(mediaLabels, f)))]
    : [profile.answers.primary, ...profile.answers.extras];
  if (!selected.length) selected.push(profile.answers.primary);
  const id = uid(),
    time = now();
  run(
    "INSERT INTO lessons(id,user_id,source_id,profile,formats,title,status,stage,created_at,updated_at) VALUES(?,?,?,?,?,?,'queued','等待开始',?,?)",
    id,
    user,
    source.id,
    JSON.stringify(profile),
    JSON.stringify(selected),
    source.title,
    time,
    time,
  );
  void drain();
  return lessonView(ownedLesson(user, id));
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  try {
    const url = new URL(req.url, "http://localhost");
    const route = url.pathname.startsWith(config.basePath + "/api")
      ? url.pathname.slice(config.basePath.length)
      : url.pathname;
    if (route === "/api/health") {
      json(res, 200, {
        ok: true,
        service: "zhijing",
        version: "1.0.0",
        generationConfigured: !!config.modelKey,
        voiceConfigured: !!config.voiceKey,
        queue: one(
          "SELECT COUNT(*) AS n FROM lessons WHERE status IN ('queued','working')",
        ).n,
      });
      return;
    }
    if (!route.startsWith("/api/")) throw new AppError("未找到页面。", 404);
    csrf(req);
    const ip = keyIP(req);
    limit("requests:" + hash(ip), 240, 60);
    const user = session(req, res);
    const method = req.method;
    if (route === "/api/me" && method === "GET") {
      json(res, 200, {
        profile: getProfile(user),
        hasRecovery: !!one("SELECT recovery_hash FROM users WHERE id=?", user)
          ?.recovery_hash,
        lessons: all(
          "SELECT * FROM lessons WHERE user_id=? ORDER BY created_at DESC LIMIT 60",
          user,
        ).map((r) => lessonView(r, false)),
      });
      return;
    }
    if (route === "/api/profile/design" && method === "POST") {
      limit("profile:global", 80);
      limit("profile:" + hash(ip), 20);
      const input = await body(req);
      const profile = await designProfile(input.answers || {});
      json(res, 200, { profile });
      return;
    }
    if (route === "/api/profile" && method === "PUT") {
      const input = await body(req);
      json(res, 200, {
        profile: saveProfile(user, cleanProfile(input.profile || {})),
      });
      return;
    }
    if (route === "/api/profile/export" && method === "GET") {
      const p = getProfile(user);
      if (!p) throw new AppError("还没有保存学习偏好。", 404);
      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="personal-learning-SKILL.md"',
      );
      res.end(skillMarkdown(p));
      return;
    }
    if (route === "/api/profile/versions" && method === "GET") {
      json(res, 200, {
        versions: all(
          "SELECT id,data,created_at FROM profile_versions WHERE user_id=? ORDER BY created_at DESC LIMIT 20",
          user,
        ).map((v) => ({
          id: v.id,
          profile: JSON.parse(v.data),
          createdAt: v.created_at,
        })),
      });
      return;
    }
    if (route === "/api/recovery" && method === "POST") {
      await body(req);
      limit("recovery:" + user, 10);
      const code = randomBytes(24).toString("base64url");
      run("UPDATE users SET recovery_hash=? WHERE id=?", hash(code), user);
      json(res, 200, { code });
      return;
    }
    if (route === "/api/recovery/restore" && method === "POST") {
      limit("restore:" + hash(ip), 12, 3600);
      const input = await body(req);
      if (typeof input.code !== "string" || input.code.length > 100)
        throw new AppError("恢复码不正确。");
      const match = one(
        "SELECT id,recovery_hash FROM users WHERE recovery_hash=?",
        hash(input.code.trim()),
      );
      if (
        !match ||
        !timingSafeEqual(
          Buffer.from(match.recovery_hash),
          Buffer.from(hash(input.code.trim())),
        )
      )
        throw new AppError("恢复码不正确，请检查后重试。", 403);
      setSession(res, match.id);
      json(res, 200, { ok: true });
      return;
    }
    if (route === "/api/sources" && method === "POST") {
      limit("sources:" + hash(ip), 50);
      json(res, 201, {
        source: insertSource(user, await acquireSource(await body(req))),
      });
      return;
    }
    if (route === "/api/sources/sample" && method === "POST") {
      await body(req);
      json(res, 201, {
        source: insertSource(user, {
          title: "平均数为什么不一定代表大多数人？",
          url: "",
          mode: "sample",
          blocks: splitSource(sampleText),
        }),
      });
      return;
    }
    if (route === "/api/lessons" && method === "POST") {
      const input = await body(req);
      if (typeof input.sourceId !== "string")
        throw new AppError("请先提供文章内容。");
      json(res, 202, {
        lesson: createJob(
          user,
          ip,
          input.sourceId,
          input.formats,
          input.overrides,
        ),
      });
      return;
    }
    const match = route.match(/^\/api\/lessons\/([a-f0-9]{32})(?:\/(.*))?$/);
    if (match) {
      const [, id, action] = match;
      const row = ownedLesson(user, id);
      if (!action && method === "GET") {
        json(res, 200, {
          lesson: {
            ...lessonView(row),
            source: getSource(user, row.source_id),
          },
        });
        return;
      }
      if (action === "retry" && method === "POST") {
        await body(req);
        if (["queued", "working"].includes(row.status))
          throw new AppError("这份内容正在生成。", 409);
        if (row.status === "ready")
          throw new AppError("这份作品已完成，无需重试。", 409);
        if (
          one(
            "SELECT COUNT(*) AS n FROM lessons WHERE status IN ('queued','working')",
          ).n >= 12
        )
          throw new AppError("当前制作队列已满，请稍后再试。", 429);
        limit("retry:global", config.maxDailyJobs);
        limit("retry:ip:" + hash(ip), config.maxIpJobs);
        limit("retry:" + user, 8);
        updateLesson(id, {
          status: "queued",
          stage: "等待重试",
          progress: row.result ? 55 : 0,
          error: "",
        });
        void drain();
        json(res, 202, { ok: true });
        return;
      }
      if (action === "feedback" && method === "POST") {
        const input = await body(req);
        updateLesson(id, {
          completed: input.completed ? 1 : 0,
          feedback: JSON.stringify({
            helpful: typeof input.helpful === "boolean" ? input.helpful : null,
            note:
              typeof input.note === "string" ? input.note.slice(0, 500) : "",
            at: now(),
          }),
        });
        json(res, 200, { ok: true });
        return;
      }
      if (action === "export.json" && method === "GET") {
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="zhijing-lesson.json"',
        );
        json(res, 200, {
          lesson: lessonView(row),
          source: getSource(user, row.source_id),
        });
        return;
      }
      if (
        (action === "player" || action === "export.html") &&
        method === "GET"
      ) {
        if (!row.result) throw new AppError("内容仍在生成中。", 409);
        const media = JSON.parse(row.media);
        let audio = "";
        if (media.status === "ready")
          audio =
            action === "export.html"
              ? `data:audio/mp4;base64,${(await fsp.readFile(path.join(mediaDir(id), "audio.m4a"))).toString("base64")}`
              : `${config.basePath}/api/lessons/${id}/media/audio.m4a`;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader(
          "Content-Security-Policy",
          "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; media-src 'self' data:; img-src 'self' data:; frame-ancestors 'self'",
        );
        if (action === "export.html")
          res.setHeader(
            "Content-Disposition",
            'attachment; filename="zhijing-learning.html"',
          );
        res.end(playerHTML(JSON.parse(row.result), media.scenes || [], audio));
        return;
      }
      if (action?.startsWith("diagram/") && method === "GET") {
        const index = Number(action.slice(8));
        const chapter = JSON.parse(row.result || "null")?.chapters[index];
        if (!Number.isInteger(index) || !chapter)
          throw new AppError("图解不存在。", 404);
        res.setHeader("Content-Type", "image/svg+xml");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="diagram-${index + 1}.svg"`,
        );
        res.end(diagramSVG(chapter));
        return;
      }
      if (
        action?.startsWith("media/") &&
        (method === "GET" || method === "HEAD")
      ) {
        const file = action.slice(6);
        const types = {
          "video.mp4": "video/mp4",
          "audio.m4a": "audio/mp4",
          "captions.vtt": "text/vtt; charset=utf-8",
          "poster.jpg": "image/jpeg",
        };
        if (!Object.hasOwn(types, file))
          throw new AppError("文件不存在。", 404);
        const location = path.join(mediaDir(id), file);
        let stat;
        try {
          stat = await fsp.stat(location);
        } catch {
          throw new AppError("文件还没准备好。", 404);
        }
        const range = req.headers.range;
        let start = 0,
          end = stat.size - 1,
          status = 200;
        if (range) {
          const m = /^bytes=(\d+)-(\d*)$/.exec(range);
          if (!m) throw new AppError("不支持的播放范围。", 416);
          start = Number(m[1]);
          end = m[2] ? Math.min(Number(m[2]), end) : end;
          if (start > end || start >= stat.size)
            throw new AppError("播放范围无效。", 416);
          status = 206;
          res.setHeader("Content-Range", `bytes ${start}-${end}/${stat.size}`);
        }
        res.setHeader("Accept-Ranges", "bytes");
        res.setHeader("Content-Length", end - start + 1);
        res.setHeader("Content-Type", types[file]);
        if (url.searchParams.has("download"))
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="zhijing-${file}"`,
          );
        res.writeHead(status);
        if (method === "HEAD") res.end();
        else fs.createReadStream(location, { start, end }).pipe(res);
        return;
      }
    }
    throw new AppError("未找到这个操作。", 404);
  } catch (error) {
    if (!res.headersSent)
      json(res, error instanceof AppError ? error.status : 500, {
        error:
          error instanceof AppError
            ? error.message
            : "服务暂时遇到问题，请稍后再试。",
        code: error.code || "SERVER_ERROR",
      });
    else res.end();
    if (!(error instanceof AppError))
      console.error("request_failed", error.name);
  }
});
server.requestTimeout = 30000;
server.headersTimeout = 15000;

let working = false,
  shuttingDown = false;
async function drain() {
  if (working || shuttingDown) return;
  const row = one(
    "SELECT * FROM lessons WHERE status='queued' ORDER BY created_at LIMIT 1",
  );
  if (!row) return;
  working = true;
  updateLesson(row.id, {
    status: "working",
    stage: "正在梳理原文",
    progress: 8,
    attempts: row.attempts + 1,
    error: "",
  });
  try {
    const storage = await fsp.statfs(config.dataDir);
    if (storage.bavail * storage.bsize < 1024 * 1024 * 1024)
      throw new AppError("存储空间暂时不足，作品已保留，请稍后重试。", 503);
    const source = getSource(row.user_id, row.source_id),
      profile = JSON.parse(row.profile),
      formats = JSON.parse(row.formats);
    const analysis = row.analysis
      ? JSON.parse(row.analysis)
      : await analyzeContent(source);
    updateLesson(row.id, {
      analysis: JSON.stringify(analysis),
      stage: "正在按你的讲法编排",
      progress: 28,
    });
    const result = row.result
      ? JSON.parse(row.result)
      : await composeLesson(source, analysis, profile);
    updateLesson(row.id, {
      result: JSON.stringify(result),
      title: result.title,
      stage: "图文已就绪，正在制作其他形式",
      progress: 55,
    });
    let media;
    try {
      media = await produceMedia(row.id, result, formats, (stage, progress) =>
        updateLesson(row.id, { stage, progress }),
      );
    } catch (error) {
      media = {
        status: "failed",
        error:
          error instanceof AppError
            ? error.message
            : "音视频制作没有完成，图文已保留，可以重试音视频。",
      };
      console.error("media_failed", row.id, error.name);
    }
    updateLesson(row.id, {
      media: JSON.stringify(media),
      status: media.status === "failed" ? "partial" : "ready",
      stage:
        media.status === "failed"
          ? "图文已完成，音视频需要重试"
          : "学习作品已完成",
      progress: 100,
    });
  } catch (error) {
    updateLesson(row.id, {
      status: "failed",
      stage: "这次制作未完成",
      error:
        error instanceof AppError
          ? error.message
          : "制作遇到问题，原文已保留，可以重试。",
    });
    console.error("job_failed", row.id, error.name);
  } finally {
    working = false;
    if (!shuttingDown) setTimeout(() => void drain(), 50);
  }
}
run(
  "UPDATE lessons SET status='queued',stage='服务恢复，等待继续' WHERE status='working'",
);
server.listen(config.port, "127.0.0.1", () => {
  console.log(`Zhijing API http://127.0.0.1:${config.port}`);
  void drain();
});
const interval = setInterval(() => void drain(), 4000);
interval.unref();
for (const signal of ["SIGTERM", "SIGINT"])
  process.once(signal, () => {
    shuttingDown = true;
    server.close();
    clearInterval(interval);
    const timer = setInterval(() => {
      if (!working) {
        clearInterval(timer);
        db.close();
        process.exit(0);
      }
    }, 300);
    setTimeout(() => process.exit(0), 19000).unref();
  });
