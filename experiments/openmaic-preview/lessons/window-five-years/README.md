# 《窗口期可能只剩五年》完整学习作品

来源为用户本轮上传的知乎正文，作者 riba2534。原文写作语境是 2026 年 2 月，不以本次制作日期替换。正文 SHA-256：`2f6914e68ca23541775a39ab6d86d8292156da7dc38757809609e8280533f02f`。

## 交付内容

- 10 章讲解视频、同内容独立音频、字幕。
- 10 张可下载关系图，并可在网页逐页阅读、放大。
- 完整文字梳理、每章原文短引与行号、成立条件。
- 6 组术语、关键说法核验、3 个可跳过的自测。
- 可下载的 Markdown 学习笔记和本次学习 Skill。

配音实测 408.8 秒，约 6 分 49 秒。字幕和章内提示按文本长度近似对齐；章节边界来自真实配音。没有声称逐字对齐。

## 内容选择

围绕一条主线展开：AI 的能力红利，未必自动变成每个人的收入红利。不是把原文拆成同样大小的段落，也不是把数学样片换个标题。

视频负责串起企业、收入、消费、就业、信贷、信任与所有权、政策反馈和个人选择。文字版保留博彩、支付、资产分化、算力依赖、机器人、科幻比喻等支线的作用及限制。未逐项核验的数值不制作成看似确定的数据图。

“五年窗口”和 2030 年危机始终标为作者的情景推演；教学新增公司、周报场景明确标注是假设。作者的资产建议不转为平台给用户的投资指令。完整原文不进入公开包，只保留必要短引、原始链接和定位。

关键核验的原始来源及日期位于 `content.mjs` 的 checks，并同时呈现在网页与笔记中：IMF（2024-01-14）、Anthropic（2026-02-05）、METR（2025-07-10 与 2026-02-24）。只核验三组关键主张，不代表全篇认证。主 Agent 查阅原页；独立子 Agent 对照完整原文和十章讲稿/梳理，未发现实质性曲解、虚构来源或财务指令化。

## 技术边界

本次使用用户提供文章做一份完整作品，内容由当前 Agent 逐章编写并核对。OpenMAIC 的 `buildCompleteScene` 组装 Scene，`SlideCanvas` 渲染图解；不声称本篇由 `generateSceneActions` 自动写成。

沿用上一份模型生成的故事开场、视频为主、不打断的示例学习规则，没有重新测评用户。制作与网页已改为通过 edition 元数据选择内容，共用同一个播放器、渲染器和媒体脚本，旧数学样片仍可独立构建。正式问卷、数据库、私人学习库和生成 API 未改动。

## 复现

在 `experiments/openmaic-preview/` 执行：

```sh
node compile-article.mjs /absolute/path/to/user-provided-article.txt
ZH_LESSON=window-five-years npm run dev -- --port 4361
# 另一个终端；沿用主项目已有私有配置，不写入 public
ZH_LESSON=window-five-years node media.mjs voice
ZH_LESSON=window-five-years ZH_PREVIEW_URL=http://127.0.0.1:4361/ node export-diagrams.mjs
ZH_LESSON=window-five-years ZH_PREVIEW_URL=http://127.0.0.1:4361/ node media.mjs video
ZH_REQUIRE_MEDIA=1 ZH_SOURCE_FILE=/absolute/path/to/user-provided-article.txt npm test
ZH_LESSON=window-five-years ZH_PREVIEW_URL=http://127.0.0.1:4361/ node acceptance.mjs
ZH_LESSON=window-five-years npm run build
```

修改讲稿后必须重做配音和视频；编译器不会覆盖已有真实时间轴，媒体脚本以指纹阻止不匹配的配音进入新视频。修改图形后需重做图解和视频。依赖安装方式与上一份试作相同，不增加主站依赖。

本次配音在用户服务器临时工作目录完成，调用已有服务适配器和私有配置。没有变更供应商、克隆音色配置、服务权限或其他项目。

计划发布入口：`https://app.chainvalley.top/zhijing/demo/zhihu-window-20260908/`。仅新增这个静态子目录，原数学样片和正式站点保留。媒体与构建包不进入 Git，发布验收结果见本文件后续记录。

## 2026-09-08 本地验收

14 项试作测试全部通过（包含真实用户附件的哈希、逐条原文短引行号和实际音频时间轴）；主站 19 项单元/HTTP 测试、类型、Lint、构建及生产页面测试通过。数学旧版和文章新版均完成真实浏览器回归：视频播放、音频播放、章节跳转、上一页/下一页、模式切换位置保留、完整文字阅读。文章版额外检查了事实核验区、自测答案展开和所有下载地址。

电脑 1440 × 1050、手机 390 × 844，无页面错误和手机横向溢出。视频完整解码无错误，成片 H.264 + AAC、1280 × 720、408.8 秒。MP4 SHA-256：`d86ae71205eb7a8bb512ca84a99233c6ea5840e2235438150c5731a807b6e47a`。构建仍有包体积的非阻断提示，未新增依赖。
